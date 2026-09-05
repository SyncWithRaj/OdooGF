import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStage,
  QuotationStatus,
  RiskLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptQuoteDto, CounterProposalDto } from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // GET QUOTE BY PORTAL TOKEN (Cost & Margin Masked for Customer)
  // ----------------------------------------------------------------------------
  async getQuoteByToken(token: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { portalToken: token },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            tier: true,
          },
        },
        lines: {
          select: {
            id: true,
            productId: true,
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                description: true,
                category: true,
                isSubscription: true,
                recurringInterval: true,
              },
            },
            quantity: true,
            unitPrice: true,
            discountPercent: true,
            lineTotal: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          select: {
            id: true,
            authorName: true,
            authorRole: true,
            message: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quotation link is invalid or expired');
    }

    if (quote.status === QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'This quotation is currently in draft state and has not yet been released to the customer portal.',
      );
    }

    return {
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      customer: quote.customer,
      lines: quote.lines,
      subtotalAmount: quote.subtotalAmount,
      totalDiscountAmount: quote.totalDiscountAmount,
      orderDiscountPercent: quote.orderDiscountPercent,
      totalTaxAmount: quote.totalTaxAmount,
      totalAmount: quote.totalAmount,
      counterDiscountProposed: quote.counterDiscountProposed,
      requestedDeliveryDate: quote.requestedDeliveryDate,
      customerTermsConfirmed: quote.customerTermsConfirmed,
      lastActivityAt: quote.lastActivityAt,
      comments: quote.comments,
      createdAt: quote.createdAt,
    };
  }

  // ----------------------------------------------------------------------------
  // ACCEPT QUOTE (Screen 11)
  // ----------------------------------------------------------------------------
  async acceptQuote(token: string, dto: AcceptQuoteDto) {
    const quote = await this.prisma.quotation.findUnique({
      where: { portalToken: token },
      include: { customer: true },
    });

    if (!quote) {
      throw new NotFoundException('Quotation link is invalid or expired');
    }

    if (quote.status === QuotationStatus.CONFIRMED) {
      return {
        success: true,
        message: 'This quotation has already been accepted.',
        status: QuotationStatus.CONFIRMED,
      };
    }

    if (quote.status === QuotationStatus.CANCELLED) {
      throw new BadRequestException('This quotation has been cancelled');
    }

    if (quote.status === QuotationStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'This quotation is currently pending internal management approval. Terms cannot be confirmed until management signs off.',
      );
    }

    await this.prisma.quotation.update({
      where: { id: quote.id },
      data: {
        status: QuotationStatus.CONFIRMED,
        customerTermsConfirmed: true,
        lastActivityAt: new Date(),
      },
    });

    await this.prisma.quotationComment.create({
      data: {
        quotationId: quote.id,
        authorName: quote.customer.name,
        authorRole: Role.CUSTOMER,
        message:
          dto.acknowledgementNote ||
          'Quotation formally accepted by customer via portal.',
      },
    });

    return {
      success: true,
      status: QuotationStatus.CONFIRMED,
      message: 'Quotation confirmed successfully. Order fulfillment will commence.',
    };
  }

  // ----------------------------------------------------------------------------
  // COUNTER PROPOSAL & RE-APPROVAL LOOP (Screen 11 & Red-Dashed Loop)
  // ----------------------------------------------------------------------------
  async counterProposal(token: string, dto: CounterProposalDto) {
    const quote = await this.prisma.quotation.findUnique({
      where: { portalToken: token },
      include: {
        customer: true,
        salesRep: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quotation link is invalid or expired');
    }

    if (
      quote.status === QuotationStatus.CONFIRMED ||
      quote.status === QuotationStatus.FULFILLED ||
      quote.status === QuotationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot propose counter terms for quotation in '${quote.status}' state`,
      );
    }

    // Lookup customer tier ceiling
    const tierCeiling = await this.prisma.tierDiscountCeiling.findUnique({
      where: { tier: quote.customer.tier },
    });
    const tierLimit = tierCeiling ? tierCeiling.maxDiscount : 5.0;

    const proposedDiscount =
      dto.counterDiscountProposed ?? dto.counterDiscountPercent ?? 0;
    const isOverCeiling = proposedDiscount > tierLimit;
    const deviation = isOverCeiling
      ? Number((proposedDiscount - tierLimit).toFixed(2))
      : 0;

    let targetStatus: QuotationStatus = QuotationStatus.UNDER_NEGOTIATION;
    let triggeredReApproval = false;
    let routingStage: ApprovalStage = ApprovalStage.SALES_MANAGER;
    let riskLevel: RiskLevel = RiskLevel.LOW;

    // THE RED-DASHED LOOP: If customer's counter discount exceeds allowed limits,
    // automatically transition to PENDING_APPROVAL and route back to manager/finance!
    if (isOverCeiling) {
      triggeredReApproval = true;
      targetStatus = QuotationStatus.PENDING_APPROVAL;
      riskLevel = deviation > 5.0 ? RiskLevel.HIGH : RiskLevel.MEDIUM;
      routingStage = ApprovalStage.SALES_MANAGER;

      const approvalReq = await this.prisma.approvalRequest.create({
        data: {
          quotationId: quote.id,
          currentStage: routingStage,
          blendedRiskLevel: riskLevel,
          worstLineDeviation: deviation,
          flagReasonSummary: `Customer Portal Counter-Proposal (${proposedDiscount}% vs ${tierLimit}% allowed ceiling, +${deviation.toFixed(1)}pt deviation)`,
          isCompleted: false,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: approvalReq.id,
          userId: quote.salesRepId,
          action: ApprovalAction.SUBMITTED,
          note: `Customer proposed ${proposedDiscount}% counter discount (+${deviation.toFixed(1)}pt deviation). Auto-routed back into approval queue.`,
        },
      });
    }

    await this.prisma.quotation.update({
      where: { id: quote.id },
      data: {
        status: targetStatus,
        counterDiscountProposed: proposedDiscount,
        ...(dto.requestedDeliveryDate && {
          requestedDeliveryDate: new Date(dto.requestedDeliveryDate),
        }),
        lastActivityAt: new Date(),
      },
    });

    await this.prisma.quotationComment.create({
      data: {
        quotationId: quote.id,
        authorName: quote.customer.name,
        authorRole: Role.CUSTOMER,
        message:
          dto.message ||
          `Customer proposed counter-discount of ${proposedDiscount}%.`,
      },
    });

    return {
      success: true,
      status: targetStatus,
      counterDiscountProposed: proposedDiscount,
      triggeredReApproval,
      riskLevel,
      deviation,
      message: triggeredReApproval
        ? `Counter proposal submitted (+${deviation.toFixed(1)}pt deviation). Re-routed to Sales Operations for management approval.`
        : 'Counter proposal submitted and recorded. Sales representative has been notified.',
    };
  }

  // ----------------------------------------------------------------------------
  // POST COMMENT FROM CUSTOMER PORTAL
  // ----------------------------------------------------------------------------
  async addComment(token: string, message: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { portalToken: token },
      include: { customer: true },
    });

    if (!quote) {
      throw new NotFoundException('Quotation link is invalid or expired');
    }

    return this.prisma.quotationComment.create({
      data: {
        quotationId: quote.id,
        authorName: quote.customer.name,
        authorRole: Role.CUSTOMER,
        message,
      },
    });
  }
}
