import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
  HealthIssueType,
  ProductCategory,
  QuotationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DispatchFulfillmentDto,
  ManualOverrideFulfillmentDto,
} from './dto/fulfillment.dto';

@Injectable()
export class FulfillmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // DISTANCE & TRANSIT CALCULATION (Engine 4 & 5)
  // ----------------------------------------------------------------------------
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  computeTransitDays(distanceKm: number): number {
    if (distanceKm <= 300) return 1;
    if (distanceKm <= 1000) return 2;
    return 4;
  }

  // ----------------------------------------------------------------------------
  // B6 & B7 & ENGINE 5: INTELLIGENT GEO-PROXIMITY MULTI-WAREHOUSE SPLIT ENGINE
  // ----------------------------------------------------------------------------
  async calculateAndCreateSplit(quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    // Filter physical products (HARDWARE) that require inventory dispatch
    const hardwareLines = quotation.lines.filter(
      (line) => line.category === ProductCategory.HARDWARE,
    );

    // If quotation has existing fulfillment order, clear its old split items
    let fulfillmentOrder = await this.prisma.fulfillmentOrder.findUnique({
      where: { quotationId },
    });

    if (fulfillmentOrder) {
      if (fulfillmentOrder.status === FulfillmentStatus.SHIPPED) {
        throw new BadRequestException('Fulfillment order has already been shipped');
      }
      await this.prisma.fulfillmentSplitItem.deleteMany({
        where: { fulfillmentOrderId: fulfillmentOrder.id },
      });
    }

    // Edge Case: Pure digital/services quotation
    if (hardwareLines.length === 0) {
      if (!fulfillmentOrder) {
        fulfillmentOrder = await this.prisma.fulfillmentOrder.create({
          data: {
            quotationId,
            status: FulfillmentStatus.CONFIRMED,
            totalShipments: 0,
            estimatedCostTotal: 0.0,
            hasBackorder: false,
          },
        });
      } else {
        fulfillmentOrder = await this.prisma.fulfillmentOrder.update({
          where: { id: fulfillmentOrder.id },
          data: {
            status: FulfillmentStatus.CONFIRMED,
            totalShipments: 0,
            estimatedCostTotal: 0.0,
            hasBackorder: false,
          },
        });
      }
      return this.getFulfillmentById(fulfillmentOrder.id);
    }

    // Dynamic customer shipping coordinates from database
    const custLat = quotation.customer?.shippingLatitude;
    const custLon = quotation.customer?.shippingLongitude;
    const hasCustomerGeo = custLat != null && custLon != null;

    // Fetch all active warehouses with current stock for required hardware
    const hardwareProductIds = hardwareLines.map((l) => l.productId);
    const allWarehouses = await this.prisma.warehouse.findMany({
      include: {
        warehouseStocks: {
          where: {
            productId: { in: hardwareProductIds },
          },
        },
      },
    });

    if (allWarehouses.length === 0) {
      throw new BadRequestException('No warehouses registered in the system');
    }

    // Calculate real Haversine distance if coordinates exist; otherwise gracefully rank by shippingCostWeight and leadDays
    const warehousesWithDistance = allWarehouses.map((wh) => {
      const hasWarehouseGeo = wh.latitude != null && wh.longitude != null;
      let distanceKm = 0;
      let transitDays = wh.defaultLeadDays;

      if (hasCustomerGeo && hasWarehouseGeo) {
        distanceKm = this.calculateHaversineDistance(
          custLat,
          custLon,
          wh.latitude,
          wh.longitude,
        );
        transitDays = this.computeTransitDays(distanceKm);
      } else {
        // Logistics fallback when GPS is unconfigured: rank by shipping cost weight and default lead time
        distanceKm = Number((wh.shippingCostWeight * 500).toFixed(1));
        transitDays = Math.max(1, wh.defaultLeadDays);
      }

      return {
        ...wh,
        distanceKm,
        transitDays,
      };
    });

    warehousesWithDistance.sort((a, b) => {
      if (hasCustomerGeo) {
        return a.distanceKm - b.distanceKm;
      }
      return a.shippingCostWeight - b.shippingCostWeight;
    });
    const top5Warehouses = warehousesWithDistance.slice(0, 5);

    // Strategy 1: Check if the single nearest warehouse can fulfill 100% of all items
    const nearestWarehouse = top5Warehouses[0];
    const nearestStockMap = new Map(
      nearestWarehouse.warehouseStocks.map((s) => [s.productId, s.available]),
    );
    const totalNeededByProduct = new Map<string, number>();
    for (const line of hardwareLines) {
      totalNeededByProduct.set(
        line.productId,
        (totalNeededByProduct.get(line.productId) ?? 0) + line.quantity,
      );
    }
    const canFulfill100Nearest = Array.from(totalNeededByProduct.entries()).every(
      ([prodId, reqQty]) => {
        const avail = nearestStockMap.get(prodId) ?? 0;
        return avail >= reqQty;
      },
    );

    const splitItemsData: any[] = [];
    let hasBackorder = false;
    let totalAllocatedUnits = 0;
    let totalNeededUnits = 0;

    if (canFulfill100Nearest) {
      // 100% from Nearest Warehouse (Single Shipment, Minimum Distance & Transit Time)
      for (const line of hardwareLines) {
        totalNeededUnits += line.quantity;
        totalAllocatedUnits += line.quantity;
        const estShipCost = Number(
          (line.quantity * 10.0 * nearestWarehouse.shippingCostWeight * (nearestWarehouse.distanceKm > 500 ? 1.2 : 1.0)).toFixed(2),
        );
        splitItemsData.push({
          warehouseId: nearestWarehouse.id,
          productId: line.productId,
          quantityFulfilled: line.quantity,
          quantityBackordered: 0,
          estimatedShipCost: estShipCost,
        });
      }
    } else {
      // Strategy 2: Waterfall Multi-Warehouse Allocation across Top 5 Nearest
      // Track remaining stock across lines to prevent double-allocating when quote has multiple lines of same product
      const warehouseRemainingStock = new Map<string, number>();
      for (const wh of top5Warehouses) {
        for (const stock of wh.warehouseStocks) {
          warehouseRemainingStock.set(`${wh.id}_${stock.productId}`, stock.available);
        }
      }

      for (const line of hardwareLines) {
        totalNeededUnits += line.quantity;
        let remainingNeeded = line.quantity;

        for (const wh of top5Warehouses) {
          if (remainingNeeded <= 0) break;

          const stockKey = `${wh.id}_${line.productId}`;
          const currentAvailable = warehouseRemainingStock.get(stockKey) ?? 0;

          if (currentAvailable > 0) {
            const allocated = Math.min(remainingNeeded, currentAvailable);
            warehouseRemainingStock.set(stockKey, currentAvailable - allocated);
            totalAllocatedUnits += allocated;
            const distanceMultiplier = wh.distanceKm > 500 ? 1.2 : 1.0;
            const estShipCost = Number(
              (allocated * 10.0 * wh.shippingCostWeight * distanceMultiplier).toFixed(2),
            );

            splitItemsData.push({
              warehouseId: wh.id,
              productId: line.productId,
              quantityFulfilled: allocated,
              quantityBackordered: 0,
              estimatedShipCost: estShipCost,
            });

            remainingNeeded -= allocated;
          }
        }

        // Shortage: If inventory across all Top 5 warehouses is insufficient -> Backorder!
        if (remainingNeeded > 0) {
          hasBackorder = true;
          splitItemsData.push({
            warehouseId: top5Warehouses[0].id,
            productId: line.productId,
            quantityFulfilled: 0,
            quantityBackordered: remainingNeeded,
            estimatedShipCost: 0.0,
          });
        }
      }
    }

    // Calculate total distinct shipments and shipping cost
    const distinctWarehouses = new Set(
      splitItemsData
        .filter((item) => item.quantityFulfilled > 0)
        .map((item) => item.warehouseId),
    );
    const totalShipments = distinctWarehouses.size;
    const estimatedCostTotal = splitItemsData.reduce(
      (sum, item) => sum + item.estimatedShipCost,
      0,
    );

    const isNetworkShortage = totalAllocatedUnits < totalNeededUnits;
    const targetStatus = isNetworkShortage
      ? FulfillmentStatus.BACKORDER
      : totalShipments > 1
        ? FulfillmentStatus.SPLIT_PENDING
        : FulfillmentStatus.CONFIRMED;

    if (!fulfillmentOrder) {
      fulfillmentOrder = await this.prisma.fulfillmentOrder.create({
        data: {
          quotationId,
          status: targetStatus,
          totalShipments,
          estimatedCostTotal: Number(estimatedCostTotal.toFixed(2)),
          hasBackorder,
          splitItems: {
            create: splitItemsData,
          },
        },
      });
    } else {
      fulfillmentOrder = await this.prisma.fulfillmentOrder.update({
        where: { id: fulfillmentOrder.id },
        data: {
          status: targetStatus,
          totalShipments,
          estimatedCostTotal: Number(estimatedCostTotal.toFixed(2)),
          hasBackorder,
          isManualOverride: false,
          splitItems: {
            create: splitItemsData,
          },
        },
      });
    }

    // Delivery Promise Slippage Tracking (Engine 4)
    // Accurately evaluate only warehouses actually allocated to ship items
    const allocatedWarehouseIds = new Set(
      splitItemsData.filter((i) => i.quantityFulfilled > 0).map((i) => i.warehouseId),
    );
    const activeAllocatedWarehouses = top5Warehouses.filter((w) =>
      allocatedWarehouseIds.has(w.id),
    );
    const effectiveWarehouses =
      activeAllocatedWarehouses.length > 0 ? activeAllocatedWarehouses : [top5Warehouses[0]];

    const maxLeadTransit = Math.max(
      ...effectiveWarehouses.map((w) => w.defaultLeadDays + w.transitDays),
    );
    const possibleDate = new Date();
    possibleDate.setDate(possibleDate.getDate() + maxLeadTransit);

    let hasDeliverySlippage = false;
    let deliverySlippageDays = 0;
    if (quotation.promisedDeliveryDate) {
      const promisedMs = new Date(quotation.promisedDeliveryDate).getTime();
      const possibleMs = possibleDate.getTime();
      if (possibleMs > promisedMs) {
        hasDeliverySlippage = true;
        deliverySlippageDays = Math.ceil((possibleMs - promisedMs) / (1000 * 60 * 60 * 24));

        const slippageDesc = `Fulfillment routing slippage: Earliest warehouse arrival (${possibleDate.toISOString().slice(0, 10)}) is ${deliverySlippageDays} day(s) after promised date.`;
        const existingSlippageAlert = await this.prisma.dealHealthAlert.findFirst({
          where: { quotationId, issueType: HealthIssueType.DELIVERY_SLIPPAGE, isResolved: false },
        });

        if (!existingSlippageAlert) {
          await this.prisma.dealHealthAlert.create({
            data: {
              quotationId,
              issueType: HealthIssueType.DELIVERY_SLIPPAGE,
              description: slippageDesc,
              isEscalated: deliverySlippageDays > 5,
              isResolved: false,
            },
          });
        } else {
          await this.prisma.dealHealthAlert.update({
            where: { id: existingSlippageAlert.id },
            data: { description: slippageDesc, isEscalated: deliverySlippageDays > 5, flaggedAt: new Date() },
          });
        }
      } else {
        await this.prisma.dealHealthAlert.updateMany({
          where: { quotationId, issueType: HealthIssueType.DELIVERY_SLIPPAGE, isResolved: false },
          data: { isResolved: true },
        });
      }
    }

    // Quotation Shortage Review Trigger (Engine 5)
    let targetQuoteStatus = quotation.status;
    if (isNetworkShortage) {
      targetQuoteStatus = QuotationStatus.SHORTAGE_REVIEW;
    } else if (quotation.status === QuotationStatus.CONFIRMED) {
      targetQuoteStatus = QuotationStatus.SPLIT_PENDING;
    }

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: targetQuoteStatus,
        possibleDeliveryDate: possibleDate,
        hasDeliverySlippage,
        deliverySlippageDays,
        isShortageReviewRequired: isNetworkShortage,
        proposedPartialQuantity: isNetworkShortage ? totalAllocatedUnits : null,
        lastActivityAt: new Date(),
      },
    });

    return this.getFulfillmentById(fulfillmentOrder.id);
  }


  // ----------------------------------------------------------------------------
  // GET FULFILLMENT DETAILS
  // ----------------------------------------------------------------------------
  async getFulfillmentById(id: string) {
    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        splitItems: {
          include: {
            warehouse: true,
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                baseCost: true,
                basePrice: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Fulfillment order with ID '${id}' not found`);
    }

    return order;
  }

  async getFulfillmentByQuotationId(quotationId: string) {
    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { quotationId },
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: true,
          },
        },
        splitItems: {
          include: {
            warehouse: true,
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`No fulfillment order exists for quotation '${quotationId}'`);
    }

    return order;
  }

  async getAllFulfillments(query?: {
    status?: FulfillmentStatus;
    hasBackorder?: boolean;
  }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.hasBackorder !== undefined) where.hasBackorder = query.hasBackorder;

    return this.prisma.fulfillmentOrder.findMany({
      where,
      include: {
        quotation: {
          select: {
            id: true,
            quoteNumber: true,
            customer: {
              select: { name: true, tier: true },
            },
            totalAmount: true,
          },
        },
        splitItems: {
          include: {
            warehouse: {
              select: { id: true, name: true, location: true },
            },
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ----------------------------------------------------------------------------
  // B7: MANUAL OVERRIDE (Screen 8)
  // ----------------------------------------------------------------------------
  async manualOverride(id: string, dto: ManualOverrideFulfillmentDto) {
    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: { quotation: true },
    });

    if (!order) {
      throw new NotFoundException(`Fulfillment order with ID '${id}' not found`);
    }

    if (order.status === FulfillmentStatus.SHIPPED) {
      throw new BadRequestException('Cannot override already dispatched fulfillment');
    }

    // Remove existing split items
    await this.prisma.fulfillmentSplitItem.deleteMany({
      where: { fulfillmentOrderId: id },
    });

    // Fetch warehouse shipping weights
    const warehouseIds = Array.from(new Set(dto.splitItems.map((i) => i.warehouseId)));
    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
    });
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    let hasBackorder = false;
    let estimatedCostTotal = 0;
    const splitData = [];

    for (const item of dto.splitItems) {
      const wh = whMap.get(item.warehouseId);
      const weight = wh ? wh.shippingCostWeight : 1.0;
      const backorderQty = item.quantityBackordered ?? 0;

      if (backorderQty > 0) {
        hasBackorder = true;
      }

      const shipCost = Number((item.quantityFulfilled * 10.0 * weight).toFixed(2));
      estimatedCostTotal += shipCost;

      splitData.push({
        fulfillmentOrderId: id,
        warehouseId: item.warehouseId,
        productId: item.productId,
        quantityFulfilled: item.quantityFulfilled,
        quantityBackordered: backorderQty,
        estimatedShipCost: shipCost,
      });
    }

    await this.prisma.fulfillmentSplitItem.createMany({
      data: splitData,
    });

    const distinctWarehouses = new Set(
      dto.splitItems
        .filter((i) => i.quantityFulfilled > 0)
        .map((i) => i.warehouseId),
    );

    const updated = await this.prisma.fulfillmentOrder.update({
      where: { id },
      data: {
        totalShipments: distinctWarehouses.size,
        estimatedCostTotal: Number(estimatedCostTotal.toFixed(2)),
        hasBackorder,
        isManualOverride: true,
        status: hasBackorder ? FulfillmentStatus.BACKORDER : FulfillmentStatus.CONFIRMED,
      },
    });

    return this.getFulfillmentById(updated.id);
  }

  // ----------------------------------------------------------------------------
  // B7: DISPATCH & INVENTORY DEDUCTION (Screen 8)
  // ----------------------------------------------------------------------------
  async dispatchFulfillment(id: string, dto?: DispatchFulfillmentDto) {
    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: {
        splitItems: true,
        quotation: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Fulfillment order with ID '${id}' not found`);
    }

    if (order.status === FulfillmentStatus.SHIPPED) {
      throw new BadRequestException('Fulfillment order has already been shipped');
    }

    // Deduct physical inventory across warehouses
    for (const item of order.splitItems) {
      if (item.quantityFulfilled > 0) {
        const stock = await this.prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: item.warehouseId,
              productId: item.productId,
            },
          },
        });

        if (stock) {
          const newInStock = Math.max(0, stock.inStock - item.quantityFulfilled);
          const newAvailable = Math.max(0, stock.available - item.quantityFulfilled);

          await this.prisma.warehouseStock.update({
            where: { id: stock.id },
            data: {
              inStock: newInStock,
              available: newAvailable,
            },
          });
        }
      }
    }

    // Update fulfillment and quotation status
    const targetFulfillmentStatus = order.hasBackorder
      ? FulfillmentStatus.PARTIALLY_SHIPPED
      : FulfillmentStatus.SHIPPED;

    const targetQuoteStatus = order.hasBackorder
      ? QuotationStatus.SPLIT_PENDING
      : QuotationStatus.FULFILLED;

    await this.prisma.fulfillmentOrder.update({
      where: { id },
      data: {
        status: targetFulfillmentStatus,
      },
    });

    await this.prisma.quotation.update({
      where: { id: order.quotationId },
      data: {
        status: targetQuoteStatus,
        lastActivityAt: new Date(),
      },
    });

    return {
      success: true,
      fulfillmentId: id,
      status: targetFulfillmentStatus,
      quotationStatus: targetQuoteStatus,
      hasBackorder: order.hasBackorder,
      carrier: dto?.carrier || 'Standard Freight Dispatch',
      message: order.hasBackorder
        ? 'Partial shipment dispatched from warehouses. Remaining items flagged on Backorder.'
        : 'All shipments dispatched successfully. Inventory deducted and quotation fulfilled.',
      fulfillmentOrder: await this.getFulfillmentById(id),
    };
  }

  // ----------------------------------------------------------------------------
  // B6 SPECIAL FLOW: CONSOLIDATE REMAINING BACKORDER
  // "If stock arrives mid fulfillment, a 'Consolidate Remaining Backorder' prompt appears automatically."
  // ----------------------------------------------------------------------------
  async consolidateRemainingBackorders(id: string) {
    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: {
        splitItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Fulfillment order '${id}' not found`);
    }

    if (!order.hasBackorder) {
      return {
        success: true,
        message: 'No pending backorders exist for this fulfillment order',
        fulfillmentOrder: await this.getFulfillmentById(id),
      };
    }

    const backorderItems = order.splitItems.filter((i) => i.quantityBackordered > 0);
    let anyConsolidated = false;

    for (const boItem of backorderItems) {
      const availableStocks = await this.prisma.warehouseStock.findMany({
        where: {
          productId: boItem.productId,
          available: { gt: 0 },
        },
        include: { warehouse: true },
        orderBy: { warehouse: { shippingCostWeight: 'asc' } },
      });

      let remainingBo = boItem.quantityBackordered;

      for (const stock of availableStocks) {
        if (remainingBo <= 0) break;

        const alloc = Math.min(remainingBo, stock.available);
        if (alloc > 0) {
          anyConsolidated = true;
          const shipCost = Number(
            (alloc * 10.0 * stock.warehouse.shippingCostWeight).toFixed(2),
          );
          await this.prisma.fulfillmentSplitItem.create({
            data: {
              fulfillmentOrderId: id,
              warehouseId: stock.warehouseId,
              productId: boItem.productId,
              quantityFulfilled: alloc,
              quantityBackordered: 0,
              estimatedShipCost: shipCost,
            },
          });
          remainingBo -= alloc;
        }
      }

      if (remainingBo === 0) {
        await this.prisma.fulfillmentSplitItem.delete({
          where: { id: boItem.id },
        });
      } else {
        await this.prisma.fulfillmentSplitItem.update({
          where: { id: boItem.id },
          data: { quantityBackordered: remainingBo },
        });
      }
    }

    const remainingBoItems = await this.prisma.fulfillmentSplitItem.findMany({
      where: { fulfillmentOrderId: id, quantityBackordered: { gt: 0 } },
    });

    const hasBackorder = remainingBoItems.length > 0;
    const allItems = await this.prisma.fulfillmentSplitItem.findMany({
      where: { fulfillmentOrderId: id },
    });

    const distinctWhs = new Set(
      allItems.filter((i) => i.quantityFulfilled > 0).map((i) => i.warehouseId),
    );
    const estCostTotal = allItems.reduce((acc, i) => acc + i.estimatedShipCost, 0);

    await this.prisma.fulfillmentOrder.update({
      where: { id },
      data: {
        hasBackorder,
        totalShipments: distinctWhs.size,
        estimatedCostTotal: Number(estCostTotal.toFixed(2)),
        status: hasBackorder ? FulfillmentStatus.BACKORDER : FulfillmentStatus.CONFIRMED,
      },
    });

    return {
      success: true,
      anyConsolidated,
      hasBackorder,
      status: hasBackorder ? FulfillmentStatus.BACKORDER : FulfillmentStatus.CONFIRMED,
      message: anyConsolidated
        ? (hasBackorder
            ? 'Partial backorder consolidated with newly arrived inventory.'
            : 'All backorders fully consolidated into active shipments! Order ready for dispatch.')
        : 'No new warehouse inventory available to consolidate pending backorders.',
      fulfillmentOrder: await this.getFulfillmentById(id),
    };
  }

  // ----------------------------------------------------------------------------
  // SHORTAGE GOVERNANCE (Engine 5: Ops / Finance Review & Partial Offer)
  // ----------------------------------------------------------------------------
  async proposeShortageOffer(fulfillmentOrderId: string, proposedQuantity: number) {
    if (
      proposedQuantity == null ||
      typeof proposedQuantity !== 'number' ||
      isNaN(proposedQuantity) ||
      proposedQuantity <= 0 ||
      !Number.isInteger(proposedQuantity)
    ) {
      throw new BadRequestException('Proposed quantity must be a positive whole integer greater than 0');
    }

    const order = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: { quotation: { include: { lines: true } } },
    });

    if (!order) {
      throw new NotFoundException(`Fulfillment order '${fulfillmentOrderId}' not found`);
    }

    if (
      order.quotation.status === QuotationStatus.CANCELLED ||
      order.quotation.status === QuotationStatus.FULFILLED
    ) {
      throw new BadRequestException(
        `Cannot propose shortage for quotation in '${order.quotation.status}' state`,
      );
    }

    const totalHardwareQty = order.quotation.lines
      .filter((l) => l.category === ProductCategory.HARDWARE)
      .reduce((sum, l) => sum + l.quantity, 0);

    if (totalHardwareQty > 0 && proposedQuantity >= totalHardwareQty) {
      throw new BadRequestException(
        `Proposed partial quantity (${proposedQuantity}) must be strictly less than the total requested order quantity (${totalHardwareQty})`,
      );
    }

    await this.prisma.quotation.update({
      where: { id: order.quotationId },
      data: {
        isShortageReviewRequired: true,
        proposedPartialQuantity: proposedQuantity,
        status: QuotationStatus.SHORTAGE_REVIEW,
        lastActivityAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Ops proposal of ${proposedQuantity} units recorded. Pushed to Customer Portal for customer sign-off.`,
      fulfillmentOrderId,
      proposedQuantity,
    };
  }
}

