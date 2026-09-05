import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminCuratedUpsellDto, CreateUpsellRuleDto, UpdateUpsellRuleDto } from './dto/upsell-rule.dto';
import { FPGrowthEngine } from './fp-growth.engine';

@Injectable()
export class UpsellRulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // 1. ADMIN CURATED RECOMMENDATIONS (Feed 1: Rank 1 to 5)
  // ----------------------------------------------------------------------------
  async createCuratedUpsell(dto: CreateAdminCuratedUpsellDto) {
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

    return this.prisma.adminCuratedUpsell.upsert({
      where: {
        baseProductId_rank: {
          baseProductId: dto.baseProductId,
          rank: dto.rank,
        },
      },
      create: {
        baseProductId: dto.baseProductId,
        recommendedProductId: dto.recommendedProductId,
        rank: dto.rank,
        isActive: true,
      },
      update: {
        recommendedProductId: dto.recommendedProductId,
        isActive: true,
      },
      include: {
        baseProduct: true,
        recommendedProduct: true,
      },
    });
  }

  async getCuratedUpsells(baseProductId?: string) {
    return this.prisma.adminCuratedUpsell.findMany({
      where: {
        ...(baseProductId && { baseProductId }),
        isActive: true,
      },
      include: {
        baseProduct: {
          select: { id: true, name: true, sku: true, category: true },
        },
        recommendedProduct: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            baseCost: true,
            basePrice: true,
            isSubscription: true,
            recurringInterval: true,
          },
        },
      },
      orderBy: { rank: 'asc' },
    });
  }

  async deleteCuratedUpsell(id: string) {
    const existing = await this.prisma.adminCuratedUpsell.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Curated upsell rule '${id}' not found`);
    }
    return this.prisma.adminCuratedUpsell.delete({ where: { id } });
  }

  // ----------------------------------------------------------------------------
  // 2. CO-PURCHASE PAIRING RULES (Existing Database Rules)
  // ----------------------------------------------------------------------------
  async getAllRules(baseProductId?: string) {
    return this.prisma.productCoPurchaseRule.findMany({
      where: {
        ...(baseProductId && { baseProductId }),
      },
      include: {
        baseProduct: {
          select: { id: true, sku: true, name: true, category: true, basePrice: true },
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

  // ----------------------------------------------------------------------------
  // 3. HYBRID UPSELL & CROSS-SELL ENGINE (Admin Feed + FP-Growth & Co-Occurrence)
  // ----------------------------------------------------------------------------
  async getHybridCartRecommendations(cartProductIds: string[]): Promise<any[]> {
    if (!cartProductIds || cartProductIds.length === 0) {
      return [];
    }

    const cartSet = new Set(cartProductIds);

    // Fetch stock availability across warehouses for in-stock filtering
    const warehouseStocks = await this.prisma.warehouseStock.groupBy({
      by: ['productId'],
      _sum: { available: true },
    });
    const stockMap = new Map<string, number>(
      warehouseStocks.map((s) => [s.productId, s._sum.available ?? 0]),
    );

    // ==========================================================================
    // CHANNEL 1: ADMIN DIRECT FEED (Rank 1 to 5 per item with stock fallback)
    // ==========================================================================
    const curatedRules = await this.prisma.adminCuratedUpsell.findMany({
      where: {
        baseProductId: { in: cartProductIds },
        isActive: true,
      },
      include: {
        baseProduct: { select: { id: true, name: true, sku: true } },
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
            isPromoted: true,
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    const adminCandidateMap = new Map<string, any>();
    for (const rule of curatedRules) {
      const recId = rule.recommendedProductId;
      if (cartSet.has(recId)) continue; // Don't suggest items already in cart

      // Availability check: if stock is 0, skip to next ranked item
      const available = stockMap.get(recId) ?? 0;
      if (available <= 0 && !rule.recommendedProduct.isSubscription) {
        continue;
      }

      if (!adminCandidateMap.has(recId)) {
        const cost = rule.recommendedProduct.baseCost;
        const price = rule.recommendedProduct.basePrice;
        const marginPct = price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0;
        const marginDelta = Number((price - cost).toFixed(2));

        adminCandidateMap.set(recId, {
          productId: recId,
          sku: rule.recommendedProduct.sku,
          name: rule.recommendedProduct.name,
          category: rule.recommendedProduct.category,
          basePrice: price,
          baseCost: cost,
          isSubscription: rule.recommendedProduct.isSubscription,
          recurringInterval: rule.recommendedProduct.recurringInterval,
          source: 'ADMIN_CURATED',
          feedRank: rule.rank,
          baseProductName: rule.baseProduct.name,
          marginDeltaBoost: marginDelta,
          marginPct,
          confidence: 0.95 - rule.rank * 0.05,
          lift: 2.0 - rule.rank * 0.15,
          promotionTag: 'Admin Recommended',
          score: 100 - rule.rank * 10,
        });
      }
    }

    // ==========================================================================
    // CHANNEL 2: HISTORICAL SALES AFFINITY & FP-GROWTH PATTERN MINING
    // ==========================================================================
    // Query historical orders to build transactions and calculate co-occurrence
    const pastQuotes = await this.prisma.quotation.findMany({
      where: {
        lines: { some: { productId: { in: cartProductIds } } },
      },
      select: {
        id: true,
        lines: { select: { productId: true, quantity: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Extract transaction baskets
    const transactions: string[][] = pastQuotes.map((q) =>
      Array.from(new Set(q.lines.map((l) => l.productId))),
    );

    // Mine association rules with native FP-Growth Engine
    let fpRules: any[] = [];
    if (transactions.length >= 3) {
      const frequentItemsets = FPGrowthEngine.mineFrequentItemsets(transactions, 0.05);
      fpRules = FPGrowthEngine.generateAssociationRules(frequentItemsets, transactions.length, 0.2, 1.05);
    }

    // Direct Co-occurrence Counter:
    // If multi-item cart: items billed with ALL cart items (combined), plus items billed individually
    const coOccurrenceCounts = new Map<string, { count: number; totalQty: number; combinedMatch: boolean }>();

    for (const q of pastQuotes) {
      const qProductIds = new Set(q.lines.map((l) => l.productId));
      const hasAllCart = cartProductIds.every((id) => qProductIds.has(id));

      for (const line of q.lines) {
        if (cartSet.has(line.productId)) continue;

        const current = coOccurrenceCounts.get(line.productId) || { count: 0, totalQty: 0, combinedMatch: false };
        current.count += 1;
        current.totalQty += line.quantity;
        if (hasAllCart && cartProductIds.length > 1) {
          current.combinedMatch = true;
        }
        coOccurrenceCounts.set(line.productId, current);
      }
    }

    // Also include static ProductCoPurchaseRule database table
    const dbPairingRules = await this.prisma.productCoPurchaseRule.findMany({
      where: {
        baseProductId: { in: cartProductIds },
        recommendedProductId: { notIn: cartProductIds },
      },
      include: {
        recommendedProduct: true,
        baseProduct: { select: { name: true } },
      },
    });

    // Candidate details lookup
    const affinityCandidateIds = Array.from(
      new Set([
        ...Array.from(coOccurrenceCounts.keys()),
        ...dbPairingRules.map((r) => r.recommendedProductId),
        ...fpRules.flatMap((r) => r.consequents),
      ]),
    ).filter((id) => !cartSet.has(id));

    const candidateProducts = await this.prisma.product.findMany({
      where: { id: { in: affinityCandidateIds }, isActive: true },
    });

    const affinityCandidateMap = new Map<string, any>();

    for (const prod of candidateProducts) {
      const available = stockMap.get(prod.id) ?? 0;
      if (available <= 0 && !prod.isSubscription) {
        continue; // Stock availability filter
      }

      const cost = prod.baseCost;
      const price = prod.basePrice;
      const marginPct = price > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0;
      const marginDelta = Number((price - cost).toFixed(2));

      // Check FP-Growth rules matching this candidate
      const matchingFpRule = fpRules.find((r) => r.consequents.includes(prod.id));
      const matchingDbRule = dbPairingRules.find((r) => r.recommendedProductId === prod.id);
      const coStats = coOccurrenceCounts.get(prod.id);

      const lift = matchingFpRule ? matchingFpRule.lift : matchingDbRule ? 1.5 : 1.2;
      const confidence = matchingFpRule ? matchingFpRule.confidence : matchingDbRule ? matchingDbRule.coPurchaseScore : 0.45;
      const promoBoost = prod.isPromoted ? 1.3 : 1.0;
      const isCombined = coStats?.combinedMatch ?? false;

      // Composite Scoring: Lift * Margin% * PromoBoost * Order-2 Multiplier
      const orderBonus = isCombined ? 1.25 : 1.0;
      const compositeScore = Number((lift * (marginPct / 100) * promoBoost * orderBonus * 10).toFixed(2));

      affinityCandidateMap.set(prod.id, {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        basePrice: price,
        baseCost: cost,
        isSubscription: prod.isSubscription,
        recurringInterval: prod.recurringInterval,
        source: isCombined ? 'COMBINED_SALES_AFFINITY' : 'SALES_AFFINITY',
        isCombinedCoOccurrence: isCombined,
        marginDeltaBoost: matchingDbRule?.marginDeltaBoost ?? marginDelta,
        marginPct,
        confidence,
        lift,
        promotionTag: matchingDbRule?.promotionTag ?? (isCombined ? 'Frequently Bought Together' : `+${marginPct}% Margin Delta`),
        score: compositeScore,
      });
    }

    // ==========================================================================
    // CHANNEL 3: BLEND, DEDUPLICATE, AND PRIORITIZE
    // Priority:
    // 1. Admin Curated (by feed rank 1..5)
    // 2. Combined Cart Affinity (by Margin %)
    // 3. Single-Item Affinity & High Margin Pairings (by Composite Score)
    // ==========================================================================
    const blendedResults: any[] = [];
    const seen = new Set<string>();

    // 1. Add Admin Curated items first (capped at top 5 per specification)
    const sortedAdmin = Array.from(adminCandidateMap.values())
      .sort((a, b) => a.feedRank - b.feedRank)
      .slice(0, 5);

    for (const item of sortedAdmin) {
      if (!seen.has(item.productId)) {
        seen.add(item.productId);
        // If it also exists in affinity, upgrade promotion tag
        if (affinityCandidateMap.has(item.productId)) {
          item.promotionTag = 'Best Match + High Margin';
          item.lift = Math.max(item.lift, affinityCandidateMap.get(item.productId).lift);
        }
        blendedResults.push(item);
      }
    }

    // 2. Add Combined Cart Co-occurrence items (up to 5 items, sorted by Margin % DESC)
    const combinedAffinity = Array.from(affinityCandidateMap.values())
      .filter((i) => i.isCombinedCoOccurrence && !seen.has(i.productId))
      .sort((a, b) => b.marginPct - a.marginPct)
      .slice(0, 5);

    for (const item of combinedAffinity) {
      if (!seen.has(item.productId)) {
        seen.add(item.productId);
        blendedResults.push(item);
      }
    }

    // 3. Add remaining Single-Item Sales Affinity / ML items (up to 3 items, sorted by composite score DESC)
    const singleAffinity = Array.from(affinityCandidateMap.values())
      .filter((i) => !seen.has(i.productId))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const item of singleAffinity) {
      if (!seen.has(item.productId)) {
        seen.add(item.productId);
        blendedResults.push(item);
      }
    }

    // Return top 10 deduplicated suggestions (5 admin + 5 affinity / 3 individual)
    return blendedResults.slice(0, 10);
  }
}
