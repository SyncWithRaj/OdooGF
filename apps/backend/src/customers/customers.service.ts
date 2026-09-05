import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new BadRequestException('A customer with this email already exists.');
    }

    if (dto.assignedRepId) {
      const rep = await this.prisma.user.findUnique({
        where: { id: dto.assignedRepId },
      });
      if (!rep) {
        throw new BadRequestException(`Assigned sales rep ID ${dto.assignedRepId} does not exist.`);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        phone: dto.phone?.trim(),
        companyName: dto.companyName?.trim(),
        tier: dto.tier || 'BRONZE',
        assignedRepId: dto.assignedRepId || null,
        historicalAvgDisc: dto.historicalAvgDisc ?? 8.0,
      },
      include: {
        assignedRep: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    return {
      success: true,
      message: 'Customer profile created successfully',
      customer,
    };
  }

  async findAll(query: CustomerQueryDto) {
    const where: any = {};

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.assignedRepId) {
      where.assignedRepId = query.assignedRepId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { email: { contains: query.search.trim(), mode: 'insensitive' } },
        { companyName: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        assignedRep: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { quotations: true, subscriptions: true, invoices: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: customers.length,
      customers,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, fullName: true, email: true, teamName: true },
        },
        quotations: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            totalAmount: true,
            totalMarginPercent: true,
            blendedRiskScore: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { quotations: true, subscriptions: true, invoices: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    return {
      success: true,
      customer,
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.assignedRepId) {
      const rep = await this.prisma.user.findUnique({
        where: { id: dto.assignedRepId },
      });
      if (!rep) {
        throw new BadRequestException(`Assigned sales rep ID ${dto.assignedRepId} does not exist.`);
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() } : {}),
        ...(dto.tier !== undefined ? { tier: dto.tier } : {}),
        ...(dto.assignedRepId !== undefined ? { assignedRepId: dto.assignedRepId } : {}),
        ...(dto.historicalAvgDisc !== undefined ? { historicalAvgDisc: dto.historicalAvgDisc } : {}),
      },
      include: {
        assignedRep: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return {
      success: true,
      message: 'Customer updated successfully',
      customer: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.customer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Customer record deleted successfully',
    };
  }
}
