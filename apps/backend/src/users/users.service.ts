import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto } from './dto/user.dto';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
      },
    });

    return {
      success: true,
      message: 'User successfully updated',
      user: this.sanitizeUser(updated),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.findOne(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.teamName !== undefined ? { teamName: dto.teamName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
      },
    });

    return {
      success: true,
      message: 'Profile successfully updated',
      user: this.sanitizeUser(updated),
    };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const userResponse = await this.findOne(userId);
    const existingAvatarUrl = userResponse.user.avatarUrl;

    // Upload to MinIO
    const uploaded = await this.storageService.uploadFile(file, 'avatars', userId);

    // Save MinIO public URL on user record
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploaded.url },
    });

    // Optionally clean up previous file if it was hosted on MinIO
    if (existingAvatarUrl && existingAvatarUrl.includes(this.storageService.bucketName)) {
      await this.storageService.deleteFile(existingAvatarUrl);
    }

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: uploaded.url,
      user: this.sanitizeUser(updated),
    };
  }

  async updateBanner(userId: string, file: Express.Multer.File) {
    const userResponse = await this.findOne(userId);
    const existingBannerUrl = userResponse.user.bannerUrl;

    // Upload to MinIO
    const uploaded = await this.storageService.uploadFile(file, 'banners', userId);

    // Save MinIO public URL on user record
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { bannerUrl: uploaded.url },
    });

    // Optionally clean up previous file if it was hosted on MinIO
    if (existingBannerUrl && existingBannerUrl.includes(this.storageService.bucketName)) {
      await this.storageService.deleteFile(existingBannerUrl);
    }

    return {
      success: true,
      message: 'Cover banner uploaded successfully',
      bannerUrl: uploaded.url,
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

