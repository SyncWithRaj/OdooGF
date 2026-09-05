import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentStatus,
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
  // B6 & B7: INTELLIGENT MULTI-WAREHOUSE SPLIT ENGINE (Screens 7 & 8)
  // ----------------------------------------------------------------------------
  async calculateAndCreateSplit(quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
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

    // Fetch all active warehouses with current stock for required hardware
    const hardwareProductIds = hardwareLines.map((l) => l.productId);
    const warehouses = await this.prisma.warehouse.findMany({
      include: {
        warehouseStocks: {
          where: {
            productId: { in: hardwareProductIds },
          },
        },
      },
      orderBy: { shippingCostWeight: 'asc' },
    });

    if (warehouses.length === 0) {
      throw new BadRequestException('No warehouses registered in the system');
    }

    // Strategy 1: Check if any single warehouse can fulfill 100% of all required items
    let singleCapableWarehouse: any = null;
    for (const wh of warehouses) {
      const stockMap = new Map(wh.warehouseStocks.map((s) => [s.productId, s.available]));
      const canFulfillAll = hardwareLines.every((line) => {
        const avail = stockMap.get(line.productId) ?? 0;
        return avail >= line.quantity;
      });

      if (canFulfillAll) {
        singleCapableWarehouse = wh;
        break; // Already sorted by lowest shippingCostWeight
      }
    }

    const splitItemsData: any[] = [];
    let hasBackorder = false;

    if (singleCapableWarehouse) {
      // 100% Fulfilled by Single Warehouse (Lowest Shipping Cost)
      for (const line of hardwareLines) {
        const estShipCost = Number(
          (line.quantity * 10.0 * singleCapableWarehouse.shippingCostWeight).toFixed(2),
        );
        splitItemsData.push({
          warehouseId: singleCapableWarehouse.id,
          productId: line.productId,
          quantityFulfilled: line.quantity,
          quantityBackordered: 0,
          estimatedShipCost: estShipCost,
        });
      }
    } else {
      // Strategy 2: Multi-Warehouse Split Allocation
      for (const line of hardwareLines) {
        let remainingNeeded = line.quantity;

        for (const wh of warehouses) {
          if (remainingNeeded <= 0) break;

          const stock = wh.warehouseStocks.find((s) => s.productId === line.productId);
          const available = stock?.available ?? 0;

          if (available > 0) {
            const allocated = Math.min(remainingNeeded, available);
            const estShipCost = Number(
              (allocated * 10.0 * wh.shippingCostWeight).toFixed(2),
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

        // If inventory across all warehouses is insufficient -> Backorder!
        if (remainingNeeded > 0) {
          hasBackorder = true;
          // Allocate backorder to primary warehouse
          splitItemsData.push({
            warehouseId: warehouses[0].id,
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

    const targetStatus = hasBackorder
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

    // Update Quotation status to SPLIT_PENDING if currently CONFIRMED
    if (quotation.status === QuotationStatus.CONFIRMED) {
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.SPLIT_PENDING },
      });
    }

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
}
