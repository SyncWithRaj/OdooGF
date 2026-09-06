import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, CreateVariantDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku.trim().toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException(`Product with SKU ${dto.sku} already exists.`);
    }

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        category: dto.category,
        unit: dto.unit || 'Each',
        baseCost: dto.baseCost,
        basePrice: dto.basePrice,
        taxPercent: dto.taxPercent ?? 18.0,
        isSubscription: dto.isSubscription ?? false,
        recurringInterval: dto.isSubscription ? dto.recurringInterval : null,
        isPromoted: dto.isPromoted ?? false,
        minMarginThreshold: dto.minMarginThreshold ?? 20.0,
      },
    });

    // Provision curated upsell recommendations if provided by Admin
    if (dto.curatedUpsells && dto.curatedUpsells.length > 0) {
      for (let i = 0; i < dto.curatedUpsells.length; i++) {
        const item = dto.curatedUpsells[i];
        const rank = item.rank || (i + 1);
        if (item.recommendedProductId && item.recommendedProductId !== product.id) {
          await this.prisma.adminCuratedUpsell.upsert({
            where: {
              baseProductId_rank: {
                baseProductId: product.id,
                rank: Math.min(5, Math.max(1, rank)),
              },
            },
            create: {
              baseProductId: product.id,
              recommendedProductId: item.recommendedProductId,
              rank: Math.min(5, Math.max(1, rank)),
              isActive: true,
            },
            update: {
              recommendedProductId: item.recommendedProductId,
              isActive: true,
            },
          }).catch(() => {});
        }
      }
    } else if (dto.upsellProductIds && dto.upsellProductIds.length > 0) {
      for (let i = 0; i < dto.upsellProductIds.length; i++) {
        const recId = dto.upsellProductIds[i];
        if (recId && recId !== product.id) {
          await this.prisma.adminCuratedUpsell.upsert({
            where: {
              baseProductId_rank: {
                baseProductId: product.id,
                rank: Math.min(5, i + 1),
              },
            },
            create: {
              baseProductId: product.id,
              recommendedProductId: recId,
              rank: Math.min(5, i + 1),
              isActive: true,
            },
            update: {
              recommendedProductId: recId,
              isActive: true,
            },
          }).catch(() => {});
        }
      }
    }

    return {
      success: true,
      message: 'Product created successfully',
      product,
    };
  }

  async findAll(query: ProductQueryDto, userRole?: Role) {
    const where: any = { isActive: true };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { sku: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.isSubscription !== undefined) {
      where.isSubscription = String(query.isSubscription) === 'true';
    }

    if (query.isPromoted !== undefined) {
      where.isPromoted = String(query.isPromoted) === 'true';
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        variants: true,
        warehouseStocks: {
          include: {
            warehouse: {
              select: { id: true, name: true, location: true, shippingCostWeight: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate aggregated inventory and apply RBAC data sanitization
    const formatted = products.map((p) => {
      const totalInStock = p.warehouseStocks.reduce((sum, s) => sum + s.inStock, 0);
      const totalReserved = p.warehouseStocks.reduce((sum, s) => sum + s.reserved, 0);
      const totalAvailable = Math.max(0, totalInStock - totalReserved);

      // Customer RBAC rule: Never leak internal costs or margin thresholds to customers
      const isCustomer = userRole === Role.CUSTOMER;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        unit: p.unit,
        basePrice: p.basePrice,
        taxPercent: p.taxPercent,
        isSubscription: p.isSubscription,
        recurringInterval: p.recurringInterval,
        isPromoted: p.isPromoted,
        isActive: p.isActive,
        variantsCount: p.variants.length,
        totalAvailableStock: totalAvailable,
        warehouseStocks: p.warehouseStocks.map((ws) => ({
          warehouseId: ws.warehouseId,
          warehouseName: ws.warehouse.name,
          inStock: ws.inStock,
          reserved: ws.reserved,
          available: Math.max(0, ws.inStock - ws.reserved),
        })),
        ...(isCustomer
          ? {}
          : {
              baseCost: p.baseCost,
              minMarginThreshold: p.minMarginThreshold,
              baseMarginPercent: Number(
                (((p.basePrice - p.baseCost) / p.basePrice) * 100).toFixed(2),
              ),
            }),
      };
    });

    return {
      success: true,
      count: formatted.length,
      products: formatted,
    };
  }

  async findOne(id: string, userRole?: Role) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        warehouseStocks: {
          include: {
            warehouse: true,
          },
        },
        priceRules: true,
        recommendedPairings: {
          include: {
            recommendedProduct: {
              select: { id: true, sku: true, name: true, basePrice: true, isPromoted: true },
            },
          },
        },
        curatedRecommendations: {
          include: {
            recommendedProduct: {
              select: { id: true, sku: true, name: true, basePrice: true, baseCost: true, category: true, isPromoted: true },
            },
          },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    const totalInStock = product.warehouseStocks.reduce((sum, s) => sum + s.inStock, 0);
    const totalReserved = product.warehouseStocks.reduce((sum, s) => sum + s.reserved, 0);
    const totalAvailable = Math.max(0, totalInStock - totalReserved);

    const isCustomer = userRole === Role.CUSTOMER;

    return {
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        unit: product.unit,
        basePrice: product.basePrice,
        taxPercent: product.taxPercent,
        isSubscription: product.isSubscription,
        recurringInterval: product.recurringInterval,
        isPromoted: product.isPromoted,
        isActive: product.isActive,
        variants: product.variants,
        totalAvailableStock: totalAvailable,
        warehouseStocks: product.warehouseStocks.map((ws) => ({
          warehouseId: ws.warehouseId,
          warehouseName: ws.warehouse.name,
          shippingCostWeight: ws.warehouse.shippingCostWeight,
          inStock: ws.inStock,
          reserved: ws.reserved,
          available: Math.max(0, ws.inStock - ws.reserved),
        })),
        priceRules: product.priceRules,
        upsellPairings: product.recommendedPairings.map((pair) => ({
          ruleId: pair.id,
          coPurchaseScore: pair.coPurchaseScore,
          marginDeltaBoost: pair.marginDeltaBoost,
          promotionTag: pair.promotionTag,
          recommendedProduct: pair.recommendedProduct,
        })),
        curatedUpsells: product.curatedRecommendations?.map((c) => ({
          id: c.id,
          rank: c.rank,
          isActive: c.isActive,
          recommendedProduct: c.recommendedProduct,
        })) || [],
        ...(isCustomer
          ? {}
          : {
              baseCost: product.baseCost,
              minMarginThreshold: product.minMarginThreshold,
              baseMarginPercent: Number(
                (((product.basePrice - product.baseCost) / product.basePrice) * 100).toFixed(2),
              ),
            }),
      },
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.baseCost !== undefined ? { baseCost: dto.baseCost } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.taxPercent !== undefined ? { taxPercent: dto.taxPercent } : {}),
        ...(dto.isPromoted !== undefined ? { isPromoted: dto.isPromoted } : {}),
        ...(dto.minMarginThreshold !== undefined ? { minMarginThreshold: dto.minMarginThreshold } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: 'Product updated successfully',
      product: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Product deactivated successfully',
    };
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findOne(productId);

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        attribute: dto.attribute.trim(),
        value: dto.value.trim(),
        extraPrice: dto.extraPrice,
        skuSuffix: dto.skuSuffix?.trim(),
      },
    });

    return {
      success: true,
      message: 'Product variant added successfully',
      variant,
    };
  }

  async removeVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant not found for product ${productId}.`);
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return {
      success: true,
      message: 'Variant deleted successfully',
    };
  }
}
