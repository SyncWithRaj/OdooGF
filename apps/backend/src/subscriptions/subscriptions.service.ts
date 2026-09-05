import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
