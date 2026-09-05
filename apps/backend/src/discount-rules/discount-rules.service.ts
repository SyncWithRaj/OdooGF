import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalculateBlendedRiskDto,
  UpdateApprovalMatrixDto,
  UpdateCategoryCeilingDto,
  UpdateTierCeilingDto,
  ValidateDiscountLineDto,
} from './dto/discount-rule.dto';

@Injectable()
export class DiscountRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRules() {
    const [tierCeilings, categoryCeilings, approvalMatrix] = await Promise.all([
      this.prisma.tierDiscountCeiling.findMany({ orderBy: { tier: 'asc' } }),
      this.prisma.categoryDiscountCeiling.findMany({ orderBy: { category: 'asc' } }),
      this.prisma.approvalChainMatrix.findMany({ orderBy: { riskLevel: 'asc' } }),
    ]);

    return {
      success: true,
      rules: {
        tierCeilings,
        categoryCeilings,
        approvalMatrix,
      },
    };
  }

  async updateTierCeiling(dto: UpdateTierCeilingDto) {
    const updated = await this.prisma.tierDiscountCeiling.upsert({
      where: { tier: dto.tier },
      create: { tier: dto.tier, maxDiscount: dto.maxDiscount },
      update: { maxDiscount: dto.maxDiscount },
    });

    return {
      success: true,
      message: `Tier ${dto.tier} ceiling updated to ${dto.maxDiscount}%`,
      ceiling: updated,
    };
  }

  async updateCategoryCeiling(dto: UpdateCategoryCeilingDto) {
    const updated = await this.prisma.categoryDiscountCeiling.upsert({
      where: { category: dto.category },
      create: { category: dto.category, maxDiscount: dto.maxDiscount },
      update: { maxDiscount: dto.maxDiscount },
    });

    return {
      success: true,
      message: `Category ${dto.category} ceiling updated to ${dto.maxDiscount}%`,
      ceiling: updated,
    };
  }

  async updateApprovalMatrix(dto: UpdateApprovalMatrixDto) {
    const updated = await this.prisma.approvalChainMatrix.upsert({
      where: { riskLevel: dto.riskLevel },
      create: {
        riskLevel: dto.riskLevel,
        description: dto.description,
        requiresManagerApproval: dto.requiresManagerApproval,
        requiresFinanceApproval: dto.requiresFinanceApproval,
      },
      update: {
        description: dto.description,
        requiresManagerApproval: dto.requiresManagerApproval,
        requiresFinanceApproval: dto.requiresFinanceApproval,
      },
    });

    return {
      success: true,
      message: `Approval matrix for risk level ${dto.riskLevel} updated`,
      matrix: updated,
    };
  }

  async validateLine(dto: ValidateDiscountLineDto) {
    const [tierRecord, categoryRecord] = await Promise.all([
      this.prisma.tierDiscountCeiling.findUnique({ where: { tier: dto.customerTier } }),
      this.prisma.categoryDiscountCeiling.findUnique({ where: { category: dto.category } }),
    ]);

    const tierLimit = tierRecord ? tierRecord.maxDiscount : 5.0;
    const categoryLimit = categoryRecord ? categoryRecord.maxDiscount : 10.0;

    // Strict Governance Formula: Allowed limit is the minimum of tier and category ceilings
    const allowedLimit = Math.min(tierLimit, categoryLimit);
    const isOverLimit = dto.proposedDiscount > allowedLimit;
    const overLimitPoints = isOverLimit
      ? Number((dto.proposedDiscount - allowedLimit).toFixed(2))
      : 0;

    let riskImpact: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (isOverLimit) {
      riskImpact = overLimitPoints > 5.0 ? 'HIGH' : 'MEDIUM';
    }

    return {
      success: true,
      validation: {
        customerTier: dto.customerTier,
        category: dto.category,
        proposedDiscount: dto.proposedDiscount,
        tierLimit,
        categoryLimit,
        allowedLimit,
        isOverLimit,
        overLimitPoints,
        riskImpact,
        statusBadge: isOverLimit ? `OVER (+${overLimitPoints}pt)` : 'OK (0pt)',
        routingRecommendation:
          riskImpact === 'HIGH'
            ? 'Requires Sales Manager approval followed by Finance Controller (L2)'
            : riskImpact === 'MEDIUM'
              ? 'Requires Sales Manager approval (L1)'
              : 'Within policy — No approval needed',
      },
    };
  }

  // ----------------------------------------------------------------------------
  // A3 NOTES: BLENDED DISCOUNT RISK ENGINE ACROSS MIXED CATEGORIES
  // ----------------------------------------------------------------------------
  async calculateBlendedRisk(dto: CalculateBlendedRiskDto) {
    const [tierCeilings, categoryCeilings] = await Promise.all([
      this.prisma.tierDiscountCeiling.findMany(),
      this.prisma.categoryDiscountCeiling.findMany(),
    ]);

    const tierMap = new Map(tierCeilings.map((t) => [t.tier, t.maxDiscount]));
    const catMap = new Map(categoryCeilings.map((c) => [c.category, c.maxDiscount]));

    const tierLimit = tierMap.get(dto.customerTier) ?? 5.0;

    let totalSubtotal = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let maxLineDeviation = 0;
    const lineDiagnostics: any[] = [];
    const flaggedLines: string[] = [];

    for (const line of dto.lines) {
      const categoryLimit = catMap.get(line.category) ?? 10.0;
      const allowedLimit = Math.min(tierLimit, categoryLimit);
      const isOverLimit = line.discountPercent > allowedLimit;
      const overLimitPoints = isOverLimit
        ? Number((line.discountPercent - allowedLimit).toFixed(2))
        : 0;

      if (overLimitPoints > maxLineDeviation) {
        maxLineDeviation = overLimitPoints;
      }

      const lineSubtotal = line.unitPrice * line.quantity;
      const discountedUnitPrice = line.unitPrice * (1 - line.discountPercent / 100);
      const lineRevenue = discountedUnitPrice * line.quantity;
      const lineCost = line.baseCost * line.quantity;
      const lineMarginPercent = lineRevenue > 0
        ? Number((((lineRevenue - lineCost) / lineRevenue) * 100).toFixed(2))
        : 0;

      totalSubtotal += lineSubtotal;
      totalRevenue += lineRevenue;
      totalCost += lineCost;

      if (isOverLimit) {
        flaggedLines.push(
          `${line.productName} (${line.category}): ${line.discountPercent}% proposed vs ${allowedLimit}% allowed (+${overLimitPoints}pt)`,
        );
      }

      lineDiagnostics.push({
        productName: line.productName,
        category: line.category,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        baseCost: line.baseCost,
        discountPercent: line.discountPercent,
        tierLimit,
        categoryLimit,
        allowedLimit,
        isOverLimit,
        overLimitPoints,
        statusBadge: isOverLimit ? `OVER (+${overLimitPoints}pt)` : 'OK (0pt)',
        lineRevenue: Number(lineRevenue.toFixed(2)),
        lineMarginPercent,
      });
    }

    const totalDiscountAmount = Number((totalSubtotal - totalRevenue).toFixed(2));
    const totalMarginPercent = totalRevenue > 0
      ? Number((((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2))
      : 0;

    // Determine Blended Risk Score and route to HIGHEST required level
    let blendedRiskScore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let highestRequiredLevel: 'APPROVED' | 'SALES_MANAGER' | 'FINANCE' = 'APPROVED';
    let approvalChain: string[] = [];
    let flagReasonSummary = 'All lines are within allowable tier and category discount ceilings.';

    if (maxLineDeviation === 0) {
      blendedRiskScore = 'LOW';
      highestRequiredLevel = 'APPROVED';
      approvalChain = [];
    } else if (maxLineDeviation <= 5.0 && totalMarginPercent >= 15.0) {
      blendedRiskScore = 'MEDIUM';
      highestRequiredLevel = 'SALES_MANAGER';
      approvalChain = ['SALES_MANAGER'];
      flagReasonSummary = `Blended Risk MEDIUM: Moderate discount breach (up to +${maxLineDeviation}pt). Requires Sales Manager approval (L1).`;
    } else {
      // Highest required level triggered
      blendedRiskScore = 'HIGH';
      highestRequiredLevel = 'FINANCE';
      approvalChain = ['SALES_MANAGER', 'FINANCE'];
      flagReasonSummary = `Blended Risk HIGH: Significant discount breach (+${maxLineDeviation}pt) or tight margins (${totalMarginPercent}%). Requires Sales Manager approval followed by Finance Controller (L2). Flagged lines: ${flaggedLines.join('; ')}`;
    }

    return {
      success: true,
      blendedEvaluation: {
        customerTier: dto.customerTier,
        blendedRiskScore,
        highestRequiredLevel,
        approvalChain,
        requiresManagerApproval: approvalChain.includes('SALES_MANAGER'),
        requiresFinanceApproval: approvalChain.includes('FINANCE'),
        maxLineDeviation,
        flagReasonSummary,
        financials: {
          totalSubtotal: Number(totalSubtotal.toFixed(2)),
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalDiscountAmount,
          totalMarginPercent,
        },
        linesCount: dto.lines.length,
        lines: lineDiagnostics,
      },
    };
  }
}
