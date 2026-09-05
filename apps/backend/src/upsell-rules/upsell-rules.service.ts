import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUpsellRuleDto, UpdateUpsellRuleDto } from './dto/upsell-rule.dto';

@Injectable()
export class UpsellRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRules(baseProductId?: string) {
    return this.prisma.productCoPurchaseRule.findMany({
      where: {
        ...(baseProductId && { baseProductId }),
      },
      include: {
        baseProduct: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            basePrice: true,
          },
        },
        recommendedProduct: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            basePrice: true,
            baseCost: true,
            isSubscription: true,
            recurringInterval: true,
          },
        },
      },
      orderBy: { coPurchaseScore: 'desc' },
    });
  }

  async getRuleById(id: string) {
    const rule = await this.prisma.productCoPurchaseRule.findUnique({
      where: { id },
      include: {
        baseProduct: true,
        recommendedProduct: true,
      },
    });
    if (!rule) {
      throw new NotFoundException(`Upsell rule with ID '${id}' not found`);
    }
    return rule;
  }

  async createRule(dto: CreateUpsellRuleDto) {
    if (dto.baseProductId === dto.recommendedProductId) {
      throw new BadRequestException('Base product and recommended product cannot be the same');
    }

    const [baseProd, recProd] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.baseProductId } }),
      this.prisma.product.findUnique({ where: { id: dto.recommendedProductId } }),
    ]);

    if (!baseProd) {
      throw new NotFoundException(`Base product '${dto.baseProductId}' not found`);
    }
    if (!recProd) {
      throw new NotFoundException(`Recommended product '${dto.recommendedProductId}' not found`);
    }

    const existing = await this.prisma.productCoPurchaseRule.findUnique({
      where: {
        baseProductId_recommendedProductId: {
          baseProductId: dto.baseProductId,
          recommendedProductId: dto.recommendedProductId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A co-purchase pairing rule already exists for these products');
    }

    return this.prisma.productCoPurchaseRule.create({
      data: {
        baseProductId: dto.baseProductId,
        recommendedProductId: dto.recommendedProductId,
        coPurchaseScore: dto.coPurchaseScore ?? 0.85,
        marginDeltaBoost: dto.marginDeltaBoost ?? 18.0,
        promotionTag: dto.promotionTag,
      },
      include: {
        baseProduct: true,
        recommendedProduct: true,
      },
    });
  }

  async updateRule(id: string, dto: UpdateUpsellRuleDto) {
    await this.getRuleById(id);

    return this.prisma.productCoPurchaseRule.update({
      where: { id },
      data: {
        ...(dto.coPurchaseScore !== undefined && { coPurchaseScore: dto.coPurchaseScore }),
        ...(dto.marginDeltaBoost !== undefined && { marginDeltaBoost: dto.marginDeltaBoost }),
        ...(dto.promotionTag !== undefined && { promotionTag: dto.promotionTag }),
      },
      include: {
        baseProduct: true,
        recommendedProduct: true,
      },
    });
  }

  async deleteRule(id: string) {
    await this.getRuleById(id);
    return this.prisma.productCoPurchaseRule.delete({
      where: { id },
    });
  }
}
