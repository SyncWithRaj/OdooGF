import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { QuotationStatus, RiskLevel, Role } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to build date range Prisma where clause
   */
  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate) {
      filter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * 1. ADMIN DASHBOARD & REPORTING METRICS
   */
  async getAdminReport(query: ReportsQueryDto) {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const whereClause: any = {};
    if (dateFilter) {
      whereClause.createdAt = dateFilter;
    }
    if (query.teamName) {
      whereClause.salesRep = { teamName: query.teamName };
    }
    if (query.repId) {
      whereClause.salesRepId = query.repId;
    }

    // 1. Fetch all quotations matching filter
    const quotations = await this.prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        salesRep: true,
        lines: {
          include: {
            product: true,
          },
        },
        approvalRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch all approval audit logs
    const approvalLogs = await this.prisma.approvalAuditLog.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
    });

    // 3. Overall KPI Calculations
    let overallRevenue = 0;
    let totalPipeline = 0;
    let totalDiscountDollars = 0;
    let totalSubtotal = 0;
    let confirmedCount = 0;
    let pendingApprovalCount = 0;
    let draftCount = 0;
    let underNegotiationCount = 0;
    let cancelledCount = 0;

    const repMap = new Map<string, {
      repId: string;
      repName: string;
      teamName: string;
      email: string;
      revenue: number;
      quotesCount: number;
      ordersCount: number;
      totalDiscountAmount: number;
      totalSubtotal: number;
      totalMarginPercent: number;
    }>();

    const teamMap = new Map<string, {
      teamName: string;
      revenue: number;
      quotesCount: number;
      ordersCount: number;
    }>();

    const categoryMap: Record<string, { name: string; revenue: number; units: number }> = {
      HARDWARE: { name: 'Hardware', revenue: 0, units: 0 },
      SERVICES: { name: 'Services', revenue: 0, units: 0 },
      SUBSCRIPTION: { name: 'Subscription', revenue: 0, units: 0 },
    };

    const productMap = new Map<string, { name: string; sku: string; category: string; revenue: number; units: number }>();

    // Discount bands
    const discountBands = {
      '0% - 5%': 0,
      '5.1% - 10%': 0,
      '10.1% - 15%': 0,
      '> 15%': 0,
    };

    // Timeline grouping (YYYY-MM-DD)
    const timelineMap = new Map<string, { date: string; revenue: number; quotesCount: number }>();

    for (const q of quotations) {
      const isWon = q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED;
      const pipelineStatuses: QuotationStatus[] = [
        QuotationStatus.DRAFT,
        QuotationStatus.PENDING_APPROVAL,
        QuotationStatus.SENT_TO_CUSTOMER,
        QuotationStatus.UNDER_NEGOTIATION,
        QuotationStatus.SPLIT_PENDING,
      ];
      const isPipeline = pipelineStatuses.includes(q.status);

      if (isWon) {
        overallRevenue += q.totalAmount;
        confirmedCount++;
      } else if (isPipeline) {
        totalPipeline += q.totalAmount;
      }

      if (q.status === QuotationStatus.PENDING_APPROVAL) pendingApprovalCount++;
      if (q.status === QuotationStatus.DRAFT) draftCount++;
      if (q.status === QuotationStatus.UNDER_NEGOTIATION) underNegotiationCount++;
      if (q.status === QuotationStatus.CANCELLED) cancelledCount++;

      totalDiscountDollars += q.totalDiscountAmount;
      totalSubtotal += q.subtotalAmount;

      // Discount bands distribution
      const disc = q.orderDiscountPercent || 0;
      if (disc <= 5) discountBands['0% - 5%']++;
      else if (disc <= 10) discountBands['5.1% - 10%']++;
      else if (disc <= 15) discountBands['10.1% - 15%']++;
      else discountBands['> 15%']++;

      // Rep aggregation
      const repKey = q.salesRepId;
      if (!repMap.has(repKey)) {
        repMap.set(repKey, {
          repId: q.salesRep.id,
          repName: q.salesRep.fullName,
          teamName: q.salesRep.teamName || 'Direct Sales',
          email: q.salesRep.email,
          revenue: 0,
          quotesCount: 0,
          ordersCount: 0,
          totalDiscountAmount: 0,
          totalSubtotal: 0,
          totalMarginPercent: 0,
        });
      }
      const repData = repMap.get(repKey)!;
      repData.quotesCount++;
      if (isWon) {
        repData.revenue += q.totalAmount;
        repData.ordersCount++;
      }
      repData.totalDiscountAmount += q.totalDiscountAmount;
      repData.totalSubtotal += q.subtotalAmount;
      repData.totalMarginPercent += q.totalMarginPercent;

      // Team aggregation
      const teamKey = q.salesRep.teamName || 'Direct Sales';
      if (!teamMap.has(teamKey)) {
        teamMap.set(teamKey, {
          teamName: teamKey,
          revenue: 0,
          quotesCount: 0,
          ordersCount: 0,
        });
      }
      const teamData = teamMap.get(teamKey)!;
      teamData.quotesCount++;
      if (isWon) {
        teamData.revenue += q.totalAmount;
        teamData.ordersCount++;
      }

      // Line-level product & category performance
      for (const line of q.lines) {
        const cat = line.category || 'HARDWARE';
        if (categoryMap[cat]) {
          categoryMap[cat].revenue += line.lineTotal;
          categoryMap[cat].units += line.quantity;
        }

        const prodKey = line.productId;
        if (!productMap.has(prodKey)) {
          productMap.set(prodKey, {
            name: line.product?.name || 'Product',
            sku: line.product?.sku || 'SKU',
            category: cat,
            revenue: 0,
            units: 0,
          });
        }
        const prodData = productMap.get(prodKey)!;
        prodData.revenue += line.lineTotal;
        prodData.units += line.quantity;
      }

      // Timeline grouping
      const dateKey = q.createdAt.toISOString().slice(0, 10);
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, { date: dateKey, revenue: 0, quotesCount: 0 });
      }
      const timePoint = timelineMap.get(dateKey)!;
      timePoint.quotesCount++;
      if (isWon) {
        timePoint.revenue += q.totalAmount;
      }
    }

    const totalQuotesCount = quotations.length;
    const conversionRate = totalQuotesCount > 0 ? (confirmedCount / totalQuotesCount) * 100 : 0;
    const avgDiscountPercent = totalSubtotal > 0 ? (totalDiscountDollars / totalSubtotal) * 100 : 0;

    // Reps array with average margin
    const salesByRep = Array.from(repMap.values()).map((r) => ({
      ...r,
      revenue: Math.round(r.revenue * 100) / 100,
      avgMarginPercent: r.quotesCount > 0 ? Math.round((r.totalMarginPercent / r.quotesCount) * 10) / 10 : 0,
      avgDiscountPercent: r.totalSubtotal > 0 ? Math.round((r.totalDiscountAmount / r.totalSubtotal) * 1000) / 10 : 0,
      winRate: r.quotesCount > 0 ? Math.round((r.ordersCount / r.quotesCount) * 1000) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    const salesByTeam = Array.from(teamMap.values()).map((t) => ({
      ...t,
      revenue: Math.round(t.revenue * 100) / 100,
    })).sort((a, b) => b.revenue - a.revenue);

    const productPerformance = Array.from(productMap.values())
      .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const approvalStats = {
      totalRequests: approvalLogs.length,
      approvedCount: approvalLogs.filter((a) => a.action === 'APPROVED').length,
      rejectedCount: approvalLogs.filter((a) => a.action === 'REJECTED').length,
      returnedCount: approvalLogs.filter((a) => a.action === 'RETURNED_FOR_REVISION').length,
      pendingCount: pendingApprovalCount,
    };

    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => ({
        ...t,
        revenue: Math.round(t.revenue * 100) / 100,
      }));

    return {
      overview: {
        overallRevenue: Math.round(overallRevenue * 100) / 100,
        totalPipeline: Math.round(totalPipeline * 100) / 100,
        totalQuotations: totalQuotesCount,
        totalOrders: confirmedCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
      },
      statusDistribution: {
        CONFIRMED: confirmedCount,
        PENDING_APPROVAL: pendingApprovalCount,
        DRAFT: draftCount,
        UNDER_NEGOTIATION: underNegotiationCount,
        CANCELLED: cancelledCount,
      },
      salesByRep,
      salesByTeam,
      categoryPerformance: Object.values(categoryMap).map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
      })),
      productPerformance,
      approvalStats,
      discountAnalytics: {
        avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
        totalDiscountDollars: Math.round(totalDiscountDollars * 100) / 100,
        distribution: Object.entries(discountBands).map(([range, count]) => ({ range, count })),
      },
      timeline,
    };
  }

  /**
   * 2. SALES MANAGER DASHBOARD & REPORTING METRICS
   * Focuses on team revenue, salesperson performance, quotes pipeline, discount patterns, and Deal Health.
   */
  async getManagerReport(query: ReportsQueryDto) {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const whereClause: any = {};
    if (dateFilter) {
      whereClause.createdAt = dateFilter;
    }
    if (query.teamName) {
      whereClause.salesRep = { teamName: query.teamName };
    }

    const quotations = await this.prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        salesRep: true,
        lines: true,
        approvalRequests: true,
        dealHealthAlerts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeDealAlerts = await this.prisma.dealHealthAlert.findMany({
      where: {
        isResolved: false,
      },
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: true,
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
    });

    let teamRevenue = 0;
    let teamPipeline = 0;
    let pendingApprovals = 0;
    let approvedQuotes = 0;
    let rejectedQuotes = 0;
    let stalledDealsCount = 0;
    let discountAnomaliesCount = 0;

    const repMap = new Map<string, {
      repId: string;
      repName: string;
      teamName: string;
      revenue: number;
      quotesCount: number;
      ordersCount: number;
      avgDiscount: number;
      pendingApprovals: number;
      stalledDeals: number;
    }>();

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      SENT_TO_CUSTOMER: 0,
      UNDER_NEGOTIATION: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };

    const stalledQuotationsList: any[] = [];

    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const q of quotations) {
      const isWon = q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED;
      const isPending = q.status === QuotationStatus.PENDING_APPROVAL;
      const isCancelled = q.status === QuotationStatus.CANCELLED;

      if (isWon) {
        teamRevenue += q.totalAmount;
        approvedQuotes++;
      } else {
        teamPipeline += q.totalAmount;
      }

      if (isPending) pendingApprovals++;
      if (isCancelled) rejectedQuotes++;

      if (statusCounts[q.status] !== undefined) {
        statusCounts[q.status]++;
      }

      // Stalled deal calculation: inactive > 7 days and not confirmed/cancelled
      const daysInactive = Math.floor((now.getTime() - new Date(q.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
      const isStalled = q.isStalled || (!isWon && !isCancelled && daysInactive >= 7);

      if (isStalled) {
        stalledDealsCount++;
        stalledQuotationsList.push({
          id: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customer.name,
          companyName: q.customer.companyName || q.customer.name,
          salesRepName: q.salesRep.fullName,
          totalAmount: q.totalAmount,
          daysInactive,
          status: q.status,
          riskScore: q.blendedRiskScore,
          lastActivityAt: q.lastActivityAt,
        });
      }

      if (q.blendedRiskScore === RiskLevel.HIGH) {
        discountAnomaliesCount++;
      }

      // Rep breakdown
      const repKey = q.salesRepId;
      if (!repMap.has(repKey)) {
        repMap.set(repKey, {
          repId: q.salesRep.id,
          repName: q.salesRep.fullName,
          teamName: q.salesRep.teamName || 'Direct Sales',
          revenue: 0,
          quotesCount: 0,
          ordersCount: 0,
          avgDiscount: 0,
          pendingApprovals: 0,
          stalledDeals: 0,
        });
      }
      const rep = repMap.get(repKey)!;
      rep.quotesCount++;
      if (isWon) {
        rep.revenue += q.totalAmount;
        rep.ordersCount++;
      }
      if (isPending) rep.pendingApprovals++;
      if (isStalled) rep.stalledDeals++;
      rep.avgDiscount += q.orderDiscountPercent;
    }

    const salespersonPerformance = Array.from(repMap.values()).map((r) => ({
      ...r,
      revenue: Math.round(r.revenue * 100) / 100,
      avgDiscount: r.quotesCount > 0 ? Math.round((r.avgDiscount / r.quotesCount) * 10) / 10 : 0,
      winRate: r.quotesCount > 0 ? Math.round((r.ordersCount / r.quotesCount) * 1000) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      teamSummary: {
        teamRevenue: Math.round(teamRevenue * 100) / 100,
        teamPipeline: Math.round(teamPipeline * 100) / 100,
        totalQuotations: quotations.length,
        approvedQuotes,
        pendingApprovals,
        rejectedQuotes,
        winRate: quotations.length > 0 ? Math.round((approvedQuotes / quotations.length) * 1000) / 10 : 0,
      },
      statusDistribution: statusCounts,
      salespersonPerformance,
      dealHealth: {
        stalledDealsCount,
        discountAnomaliesCount,
        activeAlertsCount: activeDealAlerts.length,
        stalledQuotations: stalledQuotationsList.slice(0, 10),
        activeAlerts: activeDealAlerts.map((a) => ({
          id: a.id,
          issueType: a.issueType,
          description: a.description,
          isEscalated: a.isEscalated,
          quoteNumber: a.quotation.quoteNumber,
          customerName: a.quotation.customer.name,
          repName: a.quotation.salesRep.fullName,
          amount: a.quotation.totalAmount,
          flaggedAt: a.flaggedAt,
        })),
      },
    };
  }

  /**
   * 3. SALES REP DASHBOARD & REPORTING METRICS
   * Strictly limited to the sales rep's own quota, orders, approvals, and portfolio.
   */
  async getRepReport(query: ReportsQueryDto, repId?: string) {
    const targetRepId = repId || query.repId;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const whereClause: any = {};
    if (targetRepId) {
      whereClause.salesRepId = targetRepId;
    }
    if (dateFilter) {
      whereClause.createdAt = dateFilter;
    }

    const quotations = await this.prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        lines: true,
        approvalRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let ownRevenue = 0;
    let ownPipeline = 0;
    let totalDiscountDollars = 0;
    let totalSubtotal = 0;
    let wonOrdersCount = 0;
    let pendingApprovalCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    const timelineMap = new Map<string, { date: string; revenue: number; quotesCount: number }>();

    for (const q of quotations) {
      const isWon = q.status === QuotationStatus.CONFIRMED || q.status === QuotationStatus.FULFILLED;

      if (isWon) {
        ownRevenue += q.totalAmount;
        wonOrdersCount++;
      } else {
        ownPipeline += q.totalAmount;
      }

      if (q.status === QuotationStatus.PENDING_APPROVAL) pendingApprovalCount++;
      if (q.status === QuotationStatus.CONFIRMED) approvedCount++;
      if (q.status === QuotationStatus.CANCELLED) rejectedCount++;

      totalDiscountDollars += q.totalDiscountAmount;
      totalSubtotal += q.subtotalAmount;

      const dateKey = q.createdAt.toISOString().slice(0, 10);
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, { date: dateKey, revenue: 0, quotesCount: 0 });
      }
      const pt = timelineMap.get(dateKey)!;
      pt.quotesCount++;
      if (isWon) pt.revenue += q.totalAmount;
    }

    const totalQuotesCount = quotations.length;
    const winRate = totalQuotesCount > 0 ? (wonOrdersCount / totalQuotesCount) * 100 : 0;
    const avgDiscountPercent = totalSubtotal > 0 ? (totalDiscountDollars / totalSubtotal) * 100 : 0;

    const recentQuotations = quotations.slice(0, 15).map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      customerName: q.customer.name,
      companyName: q.customer.companyName || q.customer.name,
      totalAmount: Math.round(q.totalAmount * 100) / 100,
      marginPercent: Math.round(q.totalMarginPercent * 10) / 10,
      discountPercent: q.orderDiscountPercent,
      status: q.status,
      riskLevel: q.blendedRiskScore,
      createdAt: q.createdAt,
    }));

    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => ({ ...t, revenue: Math.round(t.revenue * 100) / 100 }));

    return {
      performance: {
        ownRevenue: Math.round(ownRevenue * 100) / 100,
        ownPipeline: Math.round(ownPipeline * 100) / 100,
        totalQuotations: totalQuotesCount,
        wonOrders: wonOrdersCount,
        winRate: Math.round(winRate * 10) / 10,
        avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
      },
      approvalStatus: {
        pending: pendingApprovalCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      recentQuotations,
      timeline,
    };
  }

  /**
   * 4. DEDICATED DEAL HEALTH QUERY FOR SALES MANAGERS
   */
  async getDealHealthMetrics(query: ReportsQueryDto) {
    const alerts = await this.prisma.dealHealthAlert.findMany({
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: true,
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
    });

    const stalledQuotes = await this.prisma.quotation.findMany({
      where: {
        status: {
          notIn: [QuotationStatus.CONFIRMED, QuotationStatus.FULFILLED, QuotationStatus.CANCELLED],
        },
      },
      include: {
        customer: true,
        salesRep: true,
      },
      orderBy: { lastActivityAt: 'asc' },
    });

    const now = new Date();
    const formattedStalled = stalledQuotes
      .map((q) => {
        const daysInactive = Math.floor((now.getTime() - new Date(q.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customer.name,
          salesRepName: q.salesRep.fullName,
          totalAmount: q.totalAmount,
          daysInactive,
          status: q.status,
          riskLevel: q.blendedRiskScore,
          lastActivityAt: q.lastActivityAt,
        };
      })
      .filter((q) => q.daysInactive >= 5) // flagged if inactive >= 5 days
      .slice(0, 15);

    return {
      totalAlerts: alerts.length,
      unresolvedAlerts: alerts.filter((a) => !a.isResolved).length,
      stalledDealsCount: formattedStalled.length,
      alerts: alerts.slice(0, 20),
      stalledQuotations: formattedStalled,
    };
  }
}
