import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HealthIssueType,
  ProductCategory,
  QuotationStatus,
  RiskLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NudgeRepDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // SCREEN 2: SALES DASHBOARD METRICS
  // ----------------------------------------------------------------------------
  async getDashboardMetrics(userId?: string, role?: Role) {
    const where: any = {};
    if (role === Role.SALES_REP && userId) {
      where.salesRepId = userId;
    }

    const allQuotes = await this.prisma.quotation.findMany({
      where,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        blendedRiskScore: true,
      },
    });

    const activeStages: QuotationStatus[] = [
      QuotationStatus.DRAFT,
      QuotationStatus.PENDING_APPROVAL,
      QuotationStatus.SENT_TO_CUSTOMER,
      QuotationStatus.UNDER_NEGOTIATION,
    ];

    const wonStages: QuotationStatus[] = [
      QuotationStatus.CONFIRMED,
      QuotationStatus.FULFILLED,
    ];

    const activeQuotes = allQuotes.filter((q) => activeStages.includes(q.status));
    const pendingApprovals = allQuotes.filter(
      (q) => q.status === QuotationStatus.PENDING_APPROVAL,
    );
    const wonDeals = allQuotes.filter((q) => wonStages.includes(q.status));
    const atRiskDeals = allQuotes.filter((q) => q.blendedRiskScore === RiskLevel.HIGH);

    const pipelineValue = activeQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
    const wonValue = wonDeals.reduce((acc, q) => acc + q.totalAmount, 0);

    const totalResolved = wonDeals.length + (allQuotes.filter((q) => q.status === QuotationStatus.CANCELLED).length);
    const winRate =
      totalResolved > 0
        ? Number(((wonDeals.length / totalResolved) * 100).toFixed(1))
        : 80.0;

    return {
      activeQuotes: {
        count: activeQuotes.length,
        label: 'Active Quotes',
        change: '+2 this week',
      },
      pendingApprovals: {
        count: pendingApprovals.length,
        label: 'Pending Approvals',
        change: pendingApprovals.length > 0 ? 'Requires attention' : 'All clear',
      },
      wonDeals: {
        count: wonDeals.length,
        value: Number(wonValue.toFixed(2)),
        label: 'Won Deals',
        change: '+14% MoM',
      },
      pipelineValue: {
        value: Number(pipelineValue.toFixed(2)),
        count: activeQuotes.length,
        label: 'Pipeline Value',
        change: `${activeQuotes.length} opportunities`,
      },
      atRiskDealsCount: atRiskDeals.length,
      winRatePercent: winRate,
    };
  }

  // ----------------------------------------------------------------------------
  // SCREEN 14: DEAL HEALTH & ANOMALY DASHBOARD
  // ----------------------------------------------------------------------------
  async getDealHealthAlerts() {
    const alerts = await this.prisma.dealHealthAlert.findMany({
      include: {
        quotation: {
          include: {
            customer: {
              select: { name: true, tier: true, companyName: true },
            },
            salesRep: {
              select: { fullName: true, email: true },
            },
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
    });

    // Also identify any deals with high discount deviation
    const highRiskQuotes = await this.prisma.quotation.findMany({
      where: {
        blendedRiskScore: RiskLevel.HIGH,
        status: { in: [QuotationStatus.DRAFT, QuotationStatus.PENDING_APPROVAL] },
      },
      include: {
        customer: true,
        salesRep: true,
      },
    });

    const anomalySummaries = highRiskQuotes.map((q) => ({
      quotationId: q.id,
      quoteNumber: q.quoteNumber,
      customerName: q.customer.name,
      salesRepName: q.salesRep.fullName,
      issueType: HealthIssueType.DISCOUNT_ANOMALY,
      sentiment: 'WARNING',
      description: `High discount deviation detected on ${q.quoteNumber}. Requires management sign-off.`,
      flaggedAt: q.updatedAt,
      isEscalated: true,
    }));

    return {
      totalAlerts: alerts.length + anomalySummaries.length,
      alerts,
      anomalies: anomalySummaries,
    };
  }

  // ----------------------------------------------------------------------------
  // SCREEN 14: NUDGE REP
  // ----------------------------------------------------------------------------
  async nudgeRep(
    dto: NudgeRepDto,
    sender: { fullName: string; role: Role },
  ) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: dto.quotationId },
      include: { salesRep: true },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation '${dto.quotationId}' not found`);
    }

    const message =
      dto.message ||
      `Manager Nudge from ${sender.fullName}: Please follow up on stalled quotation ${quote.quoteNumber}.`;

    await this.prisma.quotationComment.create({
      data: {
        quotationId: quote.id,
        authorName: sender.fullName,
        authorRole: sender.role,
        message,
      },
    });

    await this.prisma.quotation.update({
      where: { id: quote.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      success: true,
      notifiedRep: quote.salesRep.fullName,
      repEmail: quote.salesRep.email,
      quotationNumber: quote.quoteNumber,
      message,
    };
  }

  // ----------------------------------------------------------------------------
  // SCREEN 15: ADMIN & EXECUTIVE REPORTING
  // ----------------------------------------------------------------------------
  async getReports() {
    const [quotes, lines] = await Promise.all([
      this.prisma.quotation.findMany({
        include: { customer: true },
      }),
      this.prisma.quotationLine.findMany(),
    ]);

    // Revenue by Category
    const categoryRevenue: Record<string, number> = {
      [ProductCategory.HARDWARE]: 0,
      [ProductCategory.SERVICES]: 0,
      [ProductCategory.SUBSCRIPTION]: 0,
    };

    for (const l of lines) {
      if (categoryRevenue[l.category] !== undefined) {
        categoryRevenue[l.category] += l.lineTotal;
      }
    }

    // Revenue by Tier
    const tierRevenue: Record<string, number> = {
      GOLD: 0,
      SILVER: 0,
      BRONZE: 0,
    };

    for (const q of quotes) {
      if (tierRevenue[q.customer.tier] !== undefined) {
        tierRevenue[q.customer.tier] += q.totalAmount;
      }
    }

    return {
      totalPipelineVolume: quotes.reduce((acc, q) => acc + q.totalAmount, 0),
      totalQuotesRecorded: quotes.length,
      revenueByCategory: categoryRevenue,
      revenueByCustomerTier: tierRevenue,
    };
  }

  // ----------------------------------------------------------------------------
  // A7: EXPORT PIPELINE AS CSV SPREADSHEET
  // ----------------------------------------------------------------------------
  async exportPipelineCsv() {
    const quotes = await this.prisma.quotation.findMany({
      include: { customer: true, salesRep: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Quote Number',
      'Customer Name',
      'Customer Tier',
      'Sales Rep',
      'Status',
      'Blended Risk',
      'Subtotal ($)',
      'Total Discount ($)',
      'Total Amount ($)',
      'Total Margin (%)',
      'Created Date',
    ];

    const rows = quotes.map((q) => [
      `"${q.quoteNumber}"`,
      `"${q.customer.name.replace(/"/g, '""')}"`,
      `"${q.customer.tier}"`,
      `"${q.salesRep.fullName.replace(/"/g, '""')}"`,
      `"${q.status}"`,
      `"${q.blendedRiskScore}"`,
      q.subtotalAmount.toFixed(2),
      q.totalDiscountAmount.toFixed(2),
      q.totalAmount.toFixed(2),
      q.totalMarginPercent.toFixed(2),
      `"${q.createdAt.toISOString().split('T')[0]}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
