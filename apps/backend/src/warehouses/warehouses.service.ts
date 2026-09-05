import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarehouseDto,
  SetReplenishmentRuleDto,
  StockAdjustmentDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new BadRequestException(`Warehouse '${dto.name}' already exists.`);
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        name: dto.name.trim(),
        location: dto.location.trim(),
        shippingCostWeight: dto.shippingCostWeight ?? 1.0,
      },
    });

    return {
      success: true,
      message: 'Warehouse registered successfully',
      warehouse,
    };
  }

  async findAll() {
    const warehouses = await this.prisma.warehouse.findMany({
      include: {
        warehouseStocks: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, category: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = warehouses.map((w) => {
      const totalInStock = w.warehouseStocks.reduce((acc, s) => acc + s.inStock, 0);
      const totalReserved = w.warehouseStocks.reduce((acc, s) => acc + s.reserved, 0);
      const totalAvailable = Math.max(0, totalInStock - totalReserved);

      return {
        id: w.id,
        name: w.name,
        location: w.location,
        shippingCostWeight: w.shippingCostWeight,
        uniqueProductsCount: w.warehouseStocks.length,
        totalInStock,
        totalReserved,
        totalAvailable,
        createdAt: w.createdAt,
      };
    });

    return {
      success: true,
      count: formatted.length,
      warehouses: formatted,
    };
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        warehouseStocks: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, category: true, basePrice: true, unit: true },
            },
          },
          orderBy: { inStock: 'desc' },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found.`);
    }

    const totalInStock = warehouse.warehouseStocks.reduce((acc, s) => acc + s.inStock, 0);
    const totalReserved = warehouse.warehouseStocks.reduce((acc, s) => acc + s.reserved, 0);
    const totalAvailable = Math.max(0, totalInStock - totalReserved);

    return {
      success: true,
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.location,
        shippingCostWeight: warehouse.shippingCostWeight,
        totalInStock,
        totalReserved,
        totalAvailable,
        stocks: warehouse.warehouseStocks.map((s) => ({
          stockId: s.id,
          productId: s.productId,
          productName: s.product.name,
          sku: s.product.sku,
          category: s.product.category,
          unit: s.product.unit,
          basePrice: s.product.basePrice,
          inStock: s.inStock,
          reserved: s.reserved,
          available: Math.max(0, s.inStock - s.reserved),
          updatedAt: s.updatedAt,
        })),
      },
    };
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
        ...(dto.shippingCostWeight !== undefined ? { shippingCostWeight: dto.shippingCostWeight } : {}),
      },
    });

    return {
      success: true,
      message: 'Warehouse updated successfully',
      warehouse: updated,
    };
  }

  async adjustStock(dto: StockAdjustmentDto) {
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${dto.warehouseId} not found.`);
    }
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found.`);
    }

    // Find current stock record or start with 0
    const currentStock = await this.prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
    });

    const newInStock = (currentStock ? currentStock.inStock : 0) + dto.deltaInStock;
    const newReserved = (currentStock ? currentStock.reserved : 0) + (dto.deltaReserved || 0);

    if (newInStock < 0) {
      throw new BadRequestException(
        `Cannot adjust stock below 0. Current in-stock is ${currentStock?.inStock ?? 0}, requested delta is ${dto.deltaInStock}.`,
      );
    }

    if (newReserved < 0) {
      throw new BadRequestException(
        `Reserved stock cannot be negative. Current reserved is ${currentStock?.reserved ?? 0}.`,
      );
    }

    const updated = await this.prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
      create: {
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        inStock: newInStock,
        reserved: newReserved,
      },
      update: {
        inStock: newInStock,
        reserved: newReserved,
      },
    });

    return {
      success: true,
      message: 'Inventory successfully adjusted',
      warehouseName: warehouse.name,
      productName: product.name,
      sku: product.sku,
      inStock: updated.inStock,
      reserved: updated.reserved,
      available: Math.max(0, updated.inStock - updated.reserved),
      minStockLevel: updated.minStockLevel,
      reorderQuantity: updated.reorderQuantity,
      isLowStock: Math.max(0, updated.inStock - updated.reserved) <= updated.minStockLevel,
      reason: dto.reason || 'Cycle count update',
    };
  }

  async setReplenishmentRule(dto: SetReplenishmentRuleDto) {
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!warehouse) throw new NotFoundException(`Warehouse ${dto.warehouseId} not found`);
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const updated = await this.prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
      create: {
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        inStock: 0,
        reserved: 0,
        minStockLevel: dto.minStockLevel,
        reorderQuantity: dto.reorderQuantity,
      },
      update: {
        minStockLevel: dto.minStockLevel,
        reorderQuantity: dto.reorderQuantity,
      },
    });

    return {
      success: true,
      message: `Replenishment rule configured for ${product.name} at ${warehouse.name}`,
      warehouseName: warehouse.name,
      productName: product.name,
      minStockLevel: updated.minStockLevel,
      reorderQuantity: updated.reorderQuantity,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.warehouse.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Warehouse facility deleted successfully',
    };
  }
}
