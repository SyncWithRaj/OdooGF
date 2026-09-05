import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  ProductCategory,
  RecurringInterval,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceQueryDto, PayInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // B9: GENERATE SPLIT INVOICES (ONE-TIME & RECURRING) FROM CONFIRMED QUOTE
  // ----------------------------------------------------------------------------
  async generateSplitInvoicesFromQuotation(quotationId: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: { product: true },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with ID '${quotationId}' not found`);
    }

    if (quote.lines.length === 0) {
      throw new BadRequestException('Quotation has no lines to invoice');
    }

    const createdInvoices = [];
    const createdSubscriptions = [];

    const oneTimeLines = quote.lines.filter(
      (l) => l.category !== ProductCategory.SUBSCRIPTION,
    );
    const subscriptionLines = quote.lines.filter(
      (l) => l.category === ProductCategory.SUBSCRIPTION,
    );

    const now = new Date();
    const invoiceCount = await this.prisma.invoice.count();
    let seq = 1001 + invoiceCount;

    // 1. One-Time Invoice for Hardware & Professional Services
    if (oneTimeLines.length > 0) {
      const oneTimeTotal = oneTimeLines.reduce((sum, l) => sum + l.lineTotal, 0);
      // Proportionally apply order-level discount if any
      const orderDiscPortion = oneTimeTotal * (quote.orderDiscountPercent / 100);
      const finalOneTimeAmount = Math.max(0, oneTimeTotal - orderDiscPortion);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms

      const oneTimeInvoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${seq++}`,
          quotationId: quote.id,
          customerId: quote.customerId,
          invoiceType: InvoiceType.ONE_TIME,
          amount: Number(finalOneTimeAmount.toFixed(2)),
          status: InvoiceStatus.UNPAID,
          dueDate,
        },
      });

      createdInvoices.push(oneTimeInvoice);
    }

    // 2. Recurring Subscriptions & Recurring Invoices (Screen 9 & 10)
    for (const subLine of subscriptionLines) {
      const interval =
        subLine.product.recurringInterval || RecurringInterval.MONTHLY;

      const nextBillingDate = new Date();
      if (interval === RecurringInterval.WEEKLY) {
        nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      } else if (interval === RecurringInterval.QUARTERLY) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
      } else if (interval === RecurringInterval.YEARLY) {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        // MONTHLY default
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Register recurring subscription contract
      const subscription = await this.prisma.subscription.create({
        data: {
          customerId: quote.customerId,
          quotationId: quote.id,
          planName: `${subLine.product.name} (${subLine.quantity} units)`,
          cycle: interval,
          amount: Number(subLine.lineTotal.toFixed(2)),
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          nextBillingDate,
        },
      });

      createdSubscriptions.push(subscription);

      // Create initial recurring invoice for the first cycle
      const subDueDate = new Date();
      subDueDate.setDate(subDueDate.getDate() + 15); // Net 15 for recurring billing

      const subInvoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: `INV-SUB-${seq++}`,
          quotationId: quote.id,
          customerId: quote.customerId,
          subscriptionId: subscription.id,
          invoiceType: InvoiceType.RECURRING,
          amount: Number(subLine.lineTotal.toFixed(2)),
          status: InvoiceStatus.UNPAID,
          dueDate: subDueDate,
        },
      });

      createdInvoices.push(subInvoice);
    }

    return {
      success: true,
      quotationId: quote.id,
      quoteNumber: quote.quoteNumber,
      totalInvoicesCreated: createdInvoices.length,
      totalSubscriptionsCreated: createdSubscriptions.length,
      invoices: createdInvoices,
      subscriptions: createdSubscriptions,
    };
  }

  // ----------------------------------------------------------------------------
  // LIST & GET INVOICES
  // ----------------------------------------------------------------------------
  async getAllInvoices(query: InvoiceQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.invoiceType) where.invoiceType = query.invoiceType;
    if (query.customerId) where.customerId = query.customerId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            tier: true,
          },
        },
        quotation: {
          select: {
            id: true,
            quoteNumber: true,
          },
        },
        subscription: {
          select: {
            id: true,
            planName: true,
            cycle: true,
            status: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        subscription: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    return invoice;
  }

  // ----------------------------------------------------------------------------
  // PAY INVOICE (Screens 12 & 13)
  // ----------------------------------------------------------------------------
  async payInvoice(id: string, dto: PayInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        success: true,
        message: 'This invoice has already been fully paid',
        invoice,
      };
    }

    // Record Payment
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: id,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod || 'Bank Transfer',
        reference: dto.reference || `TXN-${Date.now()}`,
      },
    });

    // Check if fully paid
    const priorPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = priorPaid + dto.amount;

    let updatedInvoice = invoice;
    if (totalPaid >= invoice.amount) {
      updatedInvoice = await this.prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
        include: { payments: true },
      });
    }

    return {
      success: true,
      payment,
      isFullyPaid: updatedInvoice.status === InvoiceStatus.PAID,
      totalPaidSoFar: Number(totalPaid.toFixed(2)),
      remainingBalance: Math.max(0, Number((invoice.amount - totalPaid).toFixed(2))),
      invoice: updatedInvoice,
    };
  }
}
