import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStage,
  CustomerTier,
  HealthIssueType,
  ProductCategory,
  QuotationStatus,
  RiskLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DealHealthStubService } from './deal-health.stub.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { UpsellRulesService } from '../upsell-rules/upsell-rules.service';
import {
  AddCommentDto,
  AddUpsellLineDto,
  CreateQuotationDto,
  QuotationLineItemDto,
  SubmitQuotationDto,
  UpdateQuotationLinesDto,
} from './dto/quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealHealthStub: DealHealthStubService,
    private readonly upsellRulesService: UpsellRulesService,
    private readonly discountRulesService: DiscountRulesService,
  ) {}

  // ----------------------------------------------------------------------------
  // B1: QUOTATION PIPELINE KANBAN (Screen 2)
  // ----------------------------------------------------------------------------
  async getPipelineKanban(query: {
    salesRepId?: string;
    customerId?: string;
    currentUserId?: string;
    currentUserRole?: Role;
  }) {
    // If the caller is a SALES_REP, restrict to their assigned quotations unless overridden by admin/manager
    let repFilter = query.salesRepId;
    if (query.currentUserRole === Role.SALES_REP && !repFilter) {
      repFilter = query.currentUserId;
    }

    const baseWhere: any = {};
    if (repFilter) {
      baseWhere.salesRepId = repFilter;
    }
    if (query.customerId) {
      baseWhere.customerId = query.customerId;
    }

    const stages: QuotationStatus[] = [
      QuotationStatus.DRAFT,
      QuotationStatus.PENDING_APPROVAL,
      QuotationStatus.SENT_TO_CUSTOMER,
      QuotationStatus.UNDER_NEGOTIATION,
      QuotationStatus.CONFIRMED,
    ];

    const pipelineColumns = await Promise.all(
      stages.map(async (stage) => {
        const quotes = await this.prisma.quotation.findMany({
          where: {
            ...baseWhere,
            status: stage,
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                companyName: true,
                tier: true,
              },
            },
            salesRep: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            _count: {
              select: {
                lines: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });

        const totalValue = quotes.reduce((acc, q) => acc + q.totalAmount, 0);

        return {
          stage,
          count: quotes.length,
          totalValue: Number(totalValue.toFixed(2)),
          items: quotes.map((q) => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            status: q.status,
            blendedRiskScore: q.blendedRiskScore,
            totalAmount: q.totalAmount,
            totalCost: q.totalCost,
            totalMarginPercent: q.totalMarginPercent,
            orderDiscountPercent: q.orderDiscountPercent,
            customer: q.customer,
            salesRep: q.salesRep,
            linesCount: q._count.lines,
            isStalled: q.isStalled,
            updatedAt: q.updatedAt,
            createdAt: q.createdAt,
          })),
        };
      }),
    );

    const totalPipelineValue = pipelineColumns.reduce((sum, col) => sum + col.totalValue, 0);
    const totalQuotes = pipelineColumns.reduce((sum, col) => sum + col.count, 0);

    return {
      totalPipelineValue: Number(totalPipelineValue.toFixed(2)),
      totalQuotes,
      columns: pipelineColumns,
    };
  }

  // ----------------------------------------------------------------------------
  // LIST & GET QUOTATION BY ID (Screen 3)
  // ----------------------------------------------------------------------------
  async getAllQuotations(params: {
    status?: QuotationStatus;
    customerId?: string;
    salesRepId?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.customerId) where.customerId = params.customerId;
    if (params.salesRepId) where.salesRepId = params.salesRepId;
    if (params.search) {
      where.OR = [
        { quoteNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { name: { contains: params.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        salesRep: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            lines: true,
            comments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getQuotationById(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        salesRep: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        lines: {
          include: {
            product: true,
            variant: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        approvalRequests: {
          include: {
            auditLogs: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
        dealHealthAlerts: {
          orderBy: { flaggedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with ID '${id}' not found`);
    }

    return quote;
  }

  // ----------------------------------------------------------------------------
  // B2: CREATE QUOTATION
  // ----------------------------------------------------------------------------
  async createQuotation(
    dto: CreateQuotationDto,
    currentUser: { id: string; fullName: string; role: Role },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer '${dto.customerId}' not found`);
    }

    // Determine salesRepId: prioritize assigned rep, or current user if rep
    const salesRepId =
      dto.salesRepId ??
      (currentUser.role === Role.SALES_REP ? currentUser.id : customer.assignedRepId ?? currentUser.id);

    // Generate next unique quote number: Q-1001, Q-1002, etc.
    const totalCount = await this.prisma.quotation.count();
    let quoteSeq = 1001 + totalCount;
    let quoteNumber = `Q-${quoteSeq}`;

    // Verify uniqueness
    while (await this.prisma.quotation.findUnique({ where: { quoteNumber } })) {
      quoteSeq += 1;
      quoteNumber = `Q-${quoteSeq}`;
    }

    const quotation = await this.prisma.quotation.create({
      data: {
        quoteNumber,
        customerId: customer.id,
        salesRepId,
        status: QuotationStatus.DRAFT,
        blendedRiskScore: RiskLevel.LOW,
        orderDiscountPercent: dto.orderDiscountPercent ?? 0.0,
        promisedDeliveryDate: dto.promisedDeliveryDate ? new Date(dto.promisedDeliveryDate) : null,
      },
    });

    // Populate initial lines if provided
    if (dto.lines && dto.lines.length > 0) {
      await this.syncQuotationLines(
        quotation.id,
        customer.tier,
        dto.lines,
        dto.orderDiscountPercent ?? 0.0,
        salesRepId,
        dto.promisedDeliveryDate ? new Date(dto.promisedDeliveryDate) : undefined,
      );
    }

    // Add initial comment if provided
    if (dto.initialComment) {
      await this.prisma.quotationComment.create({
        data: {
          quotationId: quotation.id,
          authorName: currentUser.fullName,
          authorRole: currentUser.role,
          message: dto.initialComment,
        },
      });
    }

    return this.getQuotationById(quotation.id);
  }

  // ----------------------------------------------------------------------------
  // B2: CPQ LINE EDITOR WITH REAL-TIME RISK, MARGIN, AND BADGES (Screens 3 & 4)
  // ----------------------------------------------------------------------------
  async updateQuotationLines(id: string, dto: UpdateQuotationLinesDto) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID '${id}' not found`);
    }

    if (
      quotation.status === QuotationStatus.CONFIRMED ||
      quotation.status === QuotationStatus.FULFILLED ||
      quotation.status === QuotationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit lines of quotation in '${quotation.status}' state`,
      );
    }

    if (dto.promisedDeliveryDate) {
      await this.prisma.quotation.update({
        where: { id },
        data: {
          promisedDeliveryDate: new Date(dto.promisedDeliveryDate),
        },
      });
    }

    await this.syncQuotationLines(
      id,
      quotation.customer.tier,
      dto.lines,
      dto.orderDiscountPercent ?? quotation.orderDiscountPercent,
      quotation.salesRepId,
      dto.promisedDeliveryDate ? new Date(dto.promisedDeliveryDate) : quotation.promisedDeliveryDate ?? undefined,
    );

    return this.getQuotationById(id);
  }

  // ----------------------------------------------------------------------------
  // INTERNAL: SYNC QUOTATION LINES & CALCULATE FINANCIALS & BLENDED RISK
  // ----------------------------------------------------------------------------
  private async syncQuotationLines(
    quotationId: string,
    customerTier: CustomerTier,
    lineDtos: QuotationLineItemDto[],
    orderDiscountPercent: number = 0,
    salesRepId?: string,
    promisedDeliveryDate?: Date,
  ) {
    const [tierCeilings, categoryCeilings] = await Promise.all([
      this.prisma.tierDiscountCeiling.findMany(),
      this.prisma.categoryDiscountCeiling.findMany(),
    ]);

    const tierMap = new Map(tierCeilings.map((t) => [t.tier, t.maxDiscount]));
    const catMap = new Map(categoryCeilings.map((c) => [c.category, c.maxDiscount]));

    const tierLimit = tierMap.get(customerTier) ?? 5.0;

    // Fetch all products in lineDtos
    const productIds = Array.from(new Set(lineDtos.map((l) => l.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Remove existing lines
    await this.prisma.quotationLine.deleteMany({
      where: { quotationId },
    });

    let totalSubtotal = 0;
    let totalDiscountAmount = 0;
    let totalCost = 0;
    let maxLineDeviation = 0;

    const computedLines = [];

    for (const item of lineDtos) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product '${item.productId}' not found`);
      }

      const unitPrice = item.unitPrice ?? product.basePrice;
      const unitCost = product.baseCost;
      const quantity = item.quantity ?? 1;
      const discountPercent = item.discountPercent ?? 0.0;

      const categoryLimit = catMap.get(product.category) ?? 10.0;
      // Formula: Allowed limit is min(tierLimit, categoryLimit)
      const allowedLimit = Math.min(tierLimit, categoryLimit);
      const isOverLimit = discountPercent > allowedLimit;
      const overLimitPoints = isOverLimit
        ? Number((discountPercent - allowedLimit).toFixed(2))
        : 0;

      if (overLimitPoints > maxLineDeviation) {
        maxLineDeviation = overLimitPoints;
      }

      const lineGross = unitPrice * quantity;
      const lineDisc = lineGross * (discountPercent / 100);
      const lineTotal = lineGross - lineDisc;
      const lineCostTotal = unitCost * quantity;
      const lineMarginPercent =
        lineTotal > 0 ? ((lineTotal - lineCostTotal) / lineTotal) * 100 : 0;

      totalSubtotal += lineGross;
      totalDiscountAmount += lineDisc;
      totalCost += lineCostTotal;

      computedLines.push({
        quotationId,
        productId: product.id,
        variantId: item.variantId,
        category: product.category,
        quantity,
        unitCost,
        unitPrice,
        discountPercent,
        allowedLimitPercent: allowedLimit,
        isOverLimit,
        overLimitPoints,
        lineTotal: Number(lineTotal.toFixed(2)),
        lineCostTotal: Number(lineCostTotal.toFixed(2)),
        lineMarginPercent: Number(lineMarginPercent.toFixed(2)),
      });
    }

    if (computedLines.length > 0) {
      await this.prisma.quotationLine.createMany({
        data: computedLines,
      });
    }

    // Compute order-level totals
    const orderDiscVal =
      (totalSubtotal - totalDiscountAmount) * (orderDiscountPercent / 100);
    const finalDiscountTotal = totalDiscountAmount + orderDiscVal;
    const finalAmount = Math.max(0, totalSubtotal - finalDiscountTotal);
    const finalMarginPercent =
      finalAmount > 0 ? ((finalAmount - totalCost) / finalAmount) * 100 : 0;

    // Determine blended risk level based on max line deviation
    let blendedRiskScore: RiskLevel = RiskLevel.LOW;
    if (maxLineDeviation > 5.0) {
      blendedRiskScore = RiskLevel.HIGH;
    } else if (maxLineDeviation > 0) {
      blendedRiskScore = RiskLevel.MEDIUM;
    }

    // Validate 90-day rep median anomaly across lines (Engine 3)
    let hasRepDiscountAnomaly = false;
    let repAnomalyMessage = '';
    if (salesRepId) {
      for (const line of computedLines) {
        const anomaly = await this.discountRulesService.validateLineDiscountAnomaly(
          salesRepId,
          line.discountPercent,
        );
        if (anomaly.isAnomaly) {
          hasRepDiscountAnomaly = true;
          repAnomalyMessage = `Line discount ${line.discountPercent}% breaches sales rep 90-day median (${anomaly.medianDiscount}%) by +${anomaly.deviation}pt (threshold: ${anomaly.threshold}%).`;
          break;
        }
      }
    }

    if (hasRepDiscountAnomaly) {
      blendedRiskScore = RiskLevel.HIGH;
      const existingAnomalyAlert = await this.prisma.dealHealthAlert.findFirst({
        where: { quotationId, issueType: HealthIssueType.DISCOUNT_ANOMALY, isResolved: false },
      });
      if (!existingAnomalyAlert) {
        await this.prisma.dealHealthAlert.create({
          data: {
            quotationId,
            issueType: HealthIssueType.DISCOUNT_ANOMALY,
            description: repAnomalyMessage,
            isEscalated: true,
            isResolved: false,
          },
        });
      } else {
        await this.prisma.dealHealthAlert.update({
          where: { id: existingAnomalyAlert.id },
          data: { description: repAnomalyMessage, flaggedAt: new Date() },
        });
      }
    } else {
      await this.prisma.dealHealthAlert.updateMany({
        where: { quotationId, issueType: HealthIssueType.DISCOUNT_ANOMALY, isResolved: false },
        data: { isResolved: true },
      });
    }

    // Lead time & Delivery slippage computation (Engine 4)
    let hasDeliverySlippage = false;
    let deliverySlippageDays = 0;
    let possibleDeliveryDate: Date | null = null;

    if (promisedDeliveryDate) {
      const maxLeadWarehouse = await this.prisma.warehouse.findFirst({
        orderBy: { defaultLeadDays: 'desc' },
      });
      const leadDays = maxLeadWarehouse?.defaultLeadDays ?? 3;
      const transitDays = 2; // Standard transit
      const totalDays = leadDays + transitDays;

      possibleDeliveryDate = new Date();
      possibleDeliveryDate.setDate(possibleDeliveryDate.getDate() + totalDays);

      const promised = new Date(promisedDeliveryDate);
      if (possibleDeliveryDate.getTime() > promised.getTime()) {
        hasDeliverySlippage = true;
        const diffMs = possibleDeliveryDate.getTime() - promised.getTime();
        deliverySlippageDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const existingSlippageAlert = await this.prisma.dealHealthAlert.findFirst({
          where: { quotationId, issueType: HealthIssueType.DELIVERY_SLIPPAGE, isResolved: false },
        });
        const slippageDesc = `Promised date (${promised.toISOString().slice(0, 10)}) is ${deliverySlippageDays} day(s) earlier than earliest possible delivery (${possibleDeliveryDate.toISOString().slice(0, 10)}).`;

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
    } else {
      await this.prisma.dealHealthAlert.updateMany({
        where: { quotationId, issueType: HealthIssueType.DELIVERY_SLIPPAGE, isResolved: false },
        data: { isResolved: true },
      });
    }

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        subtotalAmount: Number(totalSubtotal.toFixed(2)),
        totalDiscountAmount: Number(finalDiscountTotal.toFixed(2)),
        orderDiscountPercent,
        totalAmount: Number(finalAmount.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalMarginPercent: Number(finalMarginPercent.toFixed(2)),
        blendedRiskScore,
        lastActivityAt: new Date(),
        ...(possibleDeliveryDate && { possibleDeliveryDate }),
        hasDeliverySlippage,
        deliverySlippageDays,
      },
    });

    // Run modular dummy deal health evaluation (Screen 14)
    await this.dealHealthStub.evaluateAndSyncHealth(
      quotationId,
      finalMarginPercent,
      false,
    );
  }

  // ----------------------------------------------------------------------------
  // B5: HYBRID UPSELL & CROSS-SELL RECOMMENDATION ENGINE (Admin + FP-Growth/Affinity)
  // ----------------------------------------------------------------------------
  async getUpsellSuggestions(quotationId: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lines: {
          select: { productId: true },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    const currentProductIds = quote.lines.map((l) => l.productId);
    if (currentProductIds.length === 0) {
      return [];
    }

    const recommendations = await this.upsellRulesService.getHybridCartRecommendations(currentProductIds);

    return recommendations.map((item) => ({
      ruleId: item.productId,
      baseProductId: currentProductIds[0],
      baseProductName: item.baseProductName || 'Base Cart Item',
      recommendedProduct: {
        id: item.productId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        baseCost: item.baseCost,
        basePrice: item.basePrice,
        isSubscription: item.isSubscription,
        recurringInterval: item.recurringInterval,
      },
      ...item,
    }));
  }

  async addUpsellLine(
    quotationId: string,
    dto: AddUpsellLineDto,
  ) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (
      quote.status === QuotationStatus.CONFIRMED ||
      quote.status === QuotationStatus.FULFILLED ||
      quote.status === QuotationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit lines of quotation in '${quote.status}' state`,
      );
    }

    const qtyToAdd = Math.max(1, dto.quantity ?? 1);

    // Existing lines mapped to DTO format
    const currentLines: QuotationLineItemDto[] = quote.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId ?? undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
    }));

    // If item already exists in quote, increment quantity instead of creating duplicate line
    const existingIndex = currentLines.findIndex((l) => l.productId === dto.recommendedProductId);
    if (existingIndex >= 0) {
      currentLines[existingIndex].quantity += qtyToAdd;
    } else {
      currentLines.push({
        productId: dto.recommendedProductId,
        quantity: qtyToAdd,
        discountPercent: Math.max(0, dto.discountPercent ?? 0.0),
      });
    }

    await this.syncQuotationLines(
      quotationId,
      quote.customer.tier,
      currentLines,
      quote.orderDiscountPercent,
      quote.salesRepId,
      quote.promisedDeliveryDate ?? undefined,
    );

    return this.getQuotationById(quotationId);
  }

  // ----------------------------------------------------------------------------
  // B3: ZERO-CLICK APPROVAL AUTO-ROUTER (Screen 3 & Screen 5)
  // ----------------------------------------------------------------------------
  async submitQuotation(
    id: string,
    currentUser: { id: string; fullName: string; role: Role },
    dto?: SubmitQuotationDto,
  ) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with ID '${id}' not found`);
    }

    if (quote.lines.length === 0) {
      throw new BadRequestException('Cannot submit quotation with 0 line items');
    }

    if (
      quote.status === QuotationStatus.CONFIRMED ||
      quote.status === QuotationStatus.FULFILLED ||
      quote.status === QuotationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot submit quotation currently in '${quote.status}' state`,
      );
    }

    // Find worst line deviation
    const worstLineDeviation = quote.lines.reduce(
      (max, line) => Math.max(max, line.overLimitPoints),
      0,
    );

    // Decision Logic per Section A3 Notes & B3 Spec
    if (quote.blendedRiskScore === RiskLevel.LOW) {
      // 1. LOW RISK (All lines within ceilings): AUTO-APPROVE!
      await this.prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.SENT_TO_CUSTOMER,
        },
      });

      const approvalReq = await this.prisma.approvalRequest.create({
        data: {
          quotationId: id,
          currentStage: ApprovalStage.APPROVED,
          blendedRiskLevel: RiskLevel.LOW,
          worstLineDeviation: 0.0,
          flagReasonSummary: 'Zero-Click Auto-Approved: All line discounts compliant with tier and category ceilings',
          isCompleted: true,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: approvalReq.id,
          userId: currentUser.id,
          action: ApprovalAction.APPROVED,
          note: dto?.notes || 'Zero-Click Auto-Approved: No manual sign-off required.',
        },
      });

      return {
        success: true,
        status: QuotationStatus.SENT_TO_CUSTOMER,
        autoApproved: true,
        message: 'Quotation auto-approved and ready for customer presentation.',
        quotation: await this.getQuotationById(id),
      };
    } else if (quote.blendedRiskScore === RiskLevel.MEDIUM) {
      // 2. MEDIUM RISK (Max line deviation <= 5%): Single stage (Sales Manager)
      await this.prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.PENDING_APPROVAL,
        },
      });

      const approvalReq = await this.prisma.approvalRequest.create({
        data: {
          quotationId: id,
          currentStage: ApprovalStage.SALES_MANAGER,
          blendedRiskLevel: RiskLevel.MEDIUM,
          worstLineDeviation,
          flagReasonSummary: `Sales Manager Approval Required: Max line discount deviation +${worstLineDeviation.toFixed(1)}pt`,
          isCompleted: false,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: approvalReq.id,
          userId: currentUser.id,
          action: ApprovalAction.SUBMITTED,
          note: dto?.notes || `Submitted for Sales Manager review (Deviation: +${worstLineDeviation.toFixed(1)}pt)`,
        },
      });

      return {
        success: true,
        status: QuotationStatus.PENDING_APPROVAL,
        autoApproved: false,
        routing: 'SALES_MANAGER',
        message: `Quotation routed to Sales Manager queue (Risk: MEDIUM, Deviation: +${worstLineDeviation.toFixed(1)}pt).`,
        quotation: await this.getQuotationById(id),
      };
    } else {
      // 3. HIGH RISK (Max line deviation > 5%): Multi-tier (Sales Manager -> Finance Controller)
      await this.prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.PENDING_APPROVAL,
        },
      });

      const approvalReq = await this.prisma.approvalRequest.create({
        data: {
          quotationId: id,
          currentStage: ApprovalStage.SALES_MANAGER,
          blendedRiskLevel: RiskLevel.HIGH,
          worstLineDeviation,
          flagReasonSummary: `Two-Tier Approval Required (Sales Manager -> Finance): Max line discount deviation +${worstLineDeviation.toFixed(1)}pt`,
          isCompleted: false,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: approvalReq.id,
          userId: currentUser.id,
          action: ApprovalAction.SUBMITTED,
          note: dto?.notes || `Submitted for Two-Tier Approval (Deviation: +${worstLineDeviation.toFixed(1)}pt)`,
        },
      });

      return {
        success: true,
        status: QuotationStatus.PENDING_APPROVAL,
        autoApproved: false,
        routing: 'SALES_MANAGER_THEN_FINANCE',
        message: `Quotation routed for Two-Tier Approval (Risk: HIGH, Deviation: +${worstLineDeviation.toFixed(1)}pt).`,
        quotation: await this.getQuotationById(id),
      };
    }
  }

  // ----------------------------------------------------------------------------
  // COMMENTS / AUDIT NOTE LOGGING (Screen 3)
  // ----------------------------------------------------------------------------
  async addComment(
    id: string,
    currentUser: { id: string; fullName: string; role: Role },
    dto: AddCommentDto,
  ) {
    await this.getQuotationById(id);

    return this.prisma.quotationComment.create({
      data: {
        quotationId: id,
        quotationLineId: dto.quotationLineId,
        authorName: currentUser.fullName,
        authorRole: currentUser.role,
        message: dto.message,
      },
    });
  }

  async getComments(id: string) {
    await this.getQuotationById(id);
    return this.prisma.quotationComment.findMany({
      where: { quotationId: id },
      orderBy: { createdAt: 'asc' },
    });
  }
}
