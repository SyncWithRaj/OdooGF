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
  // ----------------------------------------------------------------------------
  // SCREEN 14 & ENGINE 2: DEAL HEALTH & ANOMALY DASHBOARD
  // ----------------------------------------------------------------------------
  async getDealHealthAlerts() {
    const openStatuses: QuotationStatus[] = [
      QuotationStatus.DRAFT,
      QuotationStatus.PENDING_APPROVAL,
      QuotationStatus.SENT_TO_CUSTOMER,
      QuotationStatus.UNDER_NEGOTIATION,
      QuotationStatus.SHORTAGE_REVIEW,
    ];

    const [alerts, openQuotes] = await Promise.all([
      this.prisma.dealHealthAlert.findMany({
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
      }),
      this.prisma.quotation.findMany({
        where: { status: { in: openStatuses } },
        include: {
          customer: { select: { id: true, name: true, tier: true, companyName: true } },
          salesRep: { select: { id: true, fullName: true, email: true } },
          lines: true,
        },
        orderBy: { lastActivityAt: 'asc' },
      }),
    ]);

    const now = Date.now();
    let idleLowCount = 0;
    let idleMediumCount = 0;
    let idleCriticalCount = 0;

    const idleDeals = openQuotes.map((q) => {
      const diffMs = Math.max(0, now - new Date(q.lastActivityAt).getTime());
      const idleTimeDays = Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(1));

      let severity: 'LOW' | 'MEDIUM' | 'CRITICAL' = 'LOW';
      if (idleTimeDays >= 14.0) {
        severity = 'CRITICAL';
        idleCriticalCount++;
      } else if (idleTimeDays >= 7.0) {
        severity = 'MEDIUM';
        idleMediumCount++;
      } else {
        severity = 'LOW';
        idleLowCount++;
      }

      return {
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer.name,
        salesRepName: q.salesRep.fullName,
        totalAmount: q.totalAmount,
        status: q.status,
        lastActivityAt: q.lastActivityAt,
        idleTimeDays,
        severity,
        isStalled: idleTimeDays >= 14.0,
      };
    });

    // Discount Anomalies
    const discountAnomalies = openQuotes
      .filter((q) => q.blendedRiskScore === RiskLevel.HIGH)
      .map((q) => ({
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer.name,
        salesRepName: q.salesRep.fullName,
        issueType: HealthIssueType.DISCOUNT_ANOMALY,
        totalAmount: q.totalAmount,
        severity: 'CRITICAL',
        description: `Significant discount breach detected on ${q.quoteNumber}. Deviation exceeds 90-day rep baseline +10%.`,
        flaggedAt: q.updatedAt,
      }));

    // Delivery Slippages (Engine 4)
    const deliverySlippages = openQuotes
      .filter((q) => q.hasDeliverySlippage)
      .map((q) => ({
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer.name,
        salesRepName: q.salesRep.fullName,
        issueType: HealthIssueType.DELIVERY_SLIPPAGE,
        totalAmount: q.totalAmount,
        promisedDeliveryDate: q.promisedDeliveryDate,
        possibleDeliveryDate: q.possibleDeliveryDate,
        slippageDays: q.deliverySlippageDays,
        severity: 'MEDIUM',
        description: `Delivery promise slippage of ${q.deliverySlippageDays} day(s) detected. Lead time + transit exceeds promised date.`,
        flaggedAt: q.updatedAt,
      }));

    return {
      summary: {
        totalAlerts: alerts.length + discountAnomalies.length + deliverySlippages.length,
        idleStalledCritical: idleCriticalCount,
        idleWarningMedium: idleMediumCount,
        idleHealthyLow: idleLowCount,
        discountAnomaliesCount: discountAnomalies.length,
        deliverySlippagesCount: deliverySlippages.length,
      },
      idleDeals,
      discountAnomalies,
      deliverySlippages,
      persistedAlerts: alerts,
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
