import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RecurringInterval,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustQuantityDto,
  CancelSubscriptionDto,
  CreateSubscriptionContractDto,
  SubscriptionContractQueryDto,
} from './dto/subscription-contract.dto';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // TEMPLATES / GOVERNANCE (Screen 9 & 10, A5)
  // ============================================================================
  async getAllPlans() {
    return this.prisma.subscriptionPlanTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlanTemplate.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan template with ID '${id}' not found`);
    }
    return plan;
  }

  async createPlan(dto: CreateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlanTemplate.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Subscription plan template with code '${dto.code}' already exists`);
    }

    return this.prisma.subscriptionPlanTemplate.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        interval: dto.interval,
        discountPercent: dto.discountPercent ?? 0,
        prorationPolicy: dto.prorationPolicy ?? 'CALENDAR_DAYS',
        cancellationPolicy: dto.cancellationPolicy ?? 'PRORATED_REFUND',
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    await this.getPlanById(id);

    return this.prisma.subscriptionPlanTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.interval !== undefined && { interval: dto.interval }),
        ...(dto.discountPercent !== undefined && { discountPercent: dto.discountPercent }),
        ...(dto.prorationPolicy !== undefined && { prorationPolicy: dto.prorationPolicy }),
        ...(dto.cancellationPolicy !== undefined && { cancellationPolicy: dto.cancellationPolicy }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deletePlan(id: string) {
    await this.getPlanById(id);
    return this.prisma.subscriptionPlanTemplate.delete({
      where: { id },
    });
  }

  // ============================================================================
  // LIVE SUBSCRIPTION CONTRACTS & PRORATION ENGINE (Screens 9 & 10, B10)
  // ============================================================================
  async getAllSubscriptions(query: SubscriptionContractQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.cycle) where.cycle = query.cycle;
    if (query.customerId) where.customerId = query.customerId;

    return this.prisma.subscription.findMany({
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
        prorationLogs: {
          orderBy: { changeDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscriptionById(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        invoices: true,
        prorationLogs: {
          orderBy: { changeDate: 'desc' },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription contract with ID '${id}' not found`);
    }

    return sub;
  }

  async createSubscriptionContract(dto: CreateSubscriptionContractDto) {
    const nextBillingDate = new Date();
    if (dto.cycle === RecurringInterval.WEEKLY) {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
    } else if (dto.cycle === RecurringInterval.QUARTERLY) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (dto.cycle === RecurringInterval.YEARLY) {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    return this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        quotationId: dto.quotationId,
        planName: dto.planName,
        cycle: dto.cycle || RecurringInterval.MONTHLY,
        amount: Number(dto.amount),
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate,
      },
      include: {
        customer: true,
        quotation: true,
      },
    });
  }

  async pauseSubscription(id: string) {
    const sub = await this.getSubscriptionById(id);
    if (sub.status === SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Subscription is already paused');
    }
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Cannot pause a cancelled subscription');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
    });
  }

  async resumeSubscription(id: string) {
    const sub = await this.getSubscriptionById(id);
    if (sub.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  async cancelSubscription(id: string, dto: CancelSubscriptionDto) {
    const sub = await this.getSubscriptionById(id);
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((sub.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    let cycleDays = 30;
    if (sub.cycle === RecurringInterval.WEEKLY) cycleDays = 7;
    else if (sub.cycle === RecurringInterval.QUARTERLY) cycleDays = 90;
    else if (sub.cycle === RecurringInterval.YEARLY) cycleDays = 365;

    // Proration refund calculation (Formula from A5 & B10)
    const refundRatio = Math.min(1.0, daysRemaining / cycleDays);
    const refundAmount = Number((refundRatio * sub.amount).toFixed(2));

    // Record audit in SubscriptionProrationLog
    const prorationLog = await this.prisma.subscriptionProrationLog.create({
      data: {
        subscriptionId: id,
        changeDate: now,
        oldQuantity: 1,
        newQuantity: 0,
        oldRecurringAmount: sub.amount,
        newRecurringAmount: 0.0,
        proratedDeltaAmount: -refundAmount, // Credit / Refund amount
        reason:
          dto.reason ||
          `Cancellation refund: ${daysRemaining} of ${cycleDays} days remaining in cycle.`,
      },
    });

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: now,
      },
    });

    return {
      success: true,
      subscription: updated,
      daysRemainingInCycle: daysRemaining,
      proratedRefundAmount: refundAmount,
      prorationLog,
    };
  }

  async adjustQuantity(id: string, dto: AdjustQuantityDto) {
    const sub = await this.getSubscriptionById(id);
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Can only adjust quantities on active subscriptions');
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((sub.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    let cycleDays = 30;
    if (sub.cycle === RecurringInterval.WEEKLY) cycleDays = 7;
    else if (sub.cycle === RecurringInterval.QUARTERLY) cycleDays = 90;
    else if (sub.cycle === RecurringInterval.YEARLY) cycleDays = 365;

    // Assume current recurring amount represents base rate per unit
    // If planName contains units e.g. "Care Plan 2yr (12 units)", estimate unit rate
    const unitRate = sub.amount; // or proportional
    const newAmount = Number((unitRate * (dto.newQuantity / 1)).toFixed(2));
    const deltaFullCycle = newAmount - sub.amount;
    const proratedDelta = Number(((daysRemaining / cycleDays) * deltaFullCycle).toFixed(2));

    const prorationLog = await this.prisma.subscriptionProrationLog.create({
      data: {
        subscriptionId: id,
        changeDate: now,
        oldQuantity: 1,
        newQuantity: dto.newQuantity,
        oldRecurringAmount: sub.amount,
        newRecurringAmount: newAmount,
        proratedDeltaAmount: proratedDelta,
        reason:
          dto.reason ||
          `Mid-cycle seat adjustment to ${dto.newQuantity} units (${daysRemaining}/${cycleDays} days remaining).`,
      },
    });

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        amount: newAmount,
      },
    });

    return {
      success: true,
      subscription: updated,
      oldRecurringAmount: sub.amount,
      newRecurringAmount: newAmount,
      proratedChargeAmount: proratedDelta,
      prorationLog,
    };
  }
}
