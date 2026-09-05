import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: dto.fullName.trim(),
        role: dto.role,
        teamName: dto.teamName?.trim() || null,
        passwordHash,
        isEmailVerified: true,
      },
    });

    if (dto.role === Role.CUSTOMER) {
      await this.prisma.customer.upsert({
        where: { email: normalizedEmail },
        create: {
          name: dto.fullName.trim(),
          email: normalizedEmail,
          tier: 'BRONZE',
        },
        update: {
          name: dto.fullName.trim(),
        },
      });
    }

    return {
      success: true,
      message: 'Internal user successfully provisioned',
      user: this.sanitizeUser(user),
    };
  }

  async findAll(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: users.length,
      users: users.map((u) => this.sanitizeUser(u)),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      success: true,
      user: this.sanitizeUser(user),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.teamName !== undefined ? { teamName: dto.teamName.trim() } : {}),
      },
    });

    return {
      success: true,
      message: 'User successfully updated',
      user: this.sanitizeUser(updated),
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'User removed successfully',
    };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, ...sanitized } = user;
    return sanitized;
  }
}
