import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import {
  LoginDto,
  PasswordResetInitiateDto,
  PasswordResetValidateDto,
  PasswordResetVerifyDto,
  SignupInitiateDto,
  SignupVerifyDto,
} from './dto/auth.dto';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // ----------------------------------------------------------------------------
  // 1. SIGNUP STEP 1: INITIATE (Send OTP)
  // ----------------------------------------------------------------------------
  async initiateSignup(dto: SignupInitiateDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.isEmailVerified) {
      throw new BadRequestException('An account with this email already exists. Please login.');
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password with argon2 before temporarily storing
    const passwordHash = await argon2.hash(dto.password);

    const pendingPayload = JSON.stringify({
      fullName: dto.fullName,
      passwordHash,
      role: Role.CUSTOMER,
      teamName: null,
    });

    // Delete any previous pending signup OTPs for this email
    await this.prisma.otpVerification.deleteMany({
      where: { email: normalizedEmail, type: 'SIGNUP' },
    });

    // Save pending verification
    await this.prisma.otpVerification.create({
      data: {
        email: normalizedEmail,
        otp,
        type: 'SIGNUP',
        payload: pendingPayload,
        expiresAt,
      },
    });

    // Dispatch email asynchronously so response is instant
    this.mailService
      .sendOtpEmail(normalizedEmail, otp, 'SIGNUP')
      .catch((err) => this.logger.error(`Failed to dispatch signup OTP: ${err.message}`));

    return {
      success: true,
      message: 'Verification code has been sent to your email address.',
      email: normalizedEmail,
    };
  }

  // ----------------------------------------------------------------------------
  // 2. SIGNUP STEP 2: VERIFY OTP & COMPLETE REGISTRATION
  // ----------------------------------------------------------------------------
  async verifySignup(dto: SignupVerifyDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        email: normalizedEmail,
        otp: dto.otp.trim(),
        type: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });

    if (!record || !record.payload) {
      throw new BadRequestException('Invalid or expired OTP verification code.');
    }

    const { fullName, passwordHash } = JSON.parse(record.payload);

    // Every public signup is strictly CUSTOMER
    const user = await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        fullName,
        passwordHash,
        role: Role.CUSTOMER,
        teamName: null,
        isEmailVerified: true,
      },
      update: {
        fullName,
        passwordHash,
        role: Role.CUSTOMER,
        teamName: null,
        isEmailVerified: true,
      },
    });

    // Also auto-create or ensure Customer record exists for this customer
    await this.prisma.customer.upsert({
      where: { email: normalizedEmail },
      create: {
        name: fullName,
        email: normalizedEmail,
        tier: 'BRONZE',
      },
      update: {
        name: fullName,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Hash refresh token with argon2
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    // Cleanup OTP record
    await this.prisma.otpVerification.delete({ where: { id: record.id } });

    return {
      success: true,
      message: 'Account successfully registered and verified.',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ----------------------------------------------------------------------------
  // 3. LOGIN (Email or Identifier + Password with argon2)
  // ----------------------------------------------------------------------------
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password with argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store hashed refresh token
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      success: true,
      message: 'Login successful',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ----------------------------------------------------------------------------
  // 4. REFRESH TOKEN (Rotation)
  // ----------------------------------------------------------------------------
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dealflow360_refresh_secret_ultra_secure_key_2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash) {
        throw new ForbiddenException('Access Denied: Invalid session');
      }

      // Verify presented refresh token against stored hash
      const isTokenMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
      if (!isTokenMatch) {
        throw new ForbiddenException('Access Denied: Token mismatch or expired session');
      }

      // Rotate tokens
      const newTokens = await this.generateTokens(user.id, user.email, user.role);
      const newRefreshTokenHash = await argon2.hash(newTokens.refreshToken);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return {
        success: true,
        ...newTokens,
      };
    } catch {
      throw new ForbiddenException('Access Denied: Invalid or expired refresh token');
    }
  }

  // ----------------------------------------------------------------------------
  // 5. LOGOUT (Invalidate session)
  // ----------------------------------------------------------------------------
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return {
      success: true,
      message: 'Successfully logged out.',
    };
  }

  // ----------------------------------------------------------------------------
  // 6. PASSWORD RESET STEP 1: INITIATE (MAGIC LINK)
  // ----------------------------------------------------------------------------
  async initiatePasswordReset(dto: PasswordResetInitiateDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists for security, but return generic success
      return {
        success: true,
        message: 'If an account exists with this email, a reset magic link has been dispatched.',
      };
    }

    // Generate secure 32-byte hex token and 6-digit fallback OTP
    const token = crypto.randomBytes(32).toString('hex');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.otpVerification.deleteMany({
      where: { email: normalizedEmail, type: 'PASSWORD_RESET' },
    });

    await this.prisma.otpVerification.create({
      data: {
        email: normalizedEmail,
        otp: token,
        type: 'PASSWORD_RESET',
        payload: JSON.stringify({ otp, email: normalizedEmail, userId: user.id }),
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Dispatch email asynchronously so client response is instant
    this.mailService
      .sendPasswordResetMagicLink(normalizedEmail, magicLink, token, otp)
      .catch((err) => this.logger.error(`Failed to dispatch reset email: ${err.message}`));

    return {
      success: true,
      message: 'Password reset link dispatched to your registered email address.',
      email: normalizedEmail,
    };
  }

  // ----------------------------------------------------------------------------
  // 6B. PASSWORD RESET VALIDATE TOKEN
  // ----------------------------------------------------------------------------
  async validatePasswordResetToken(token: string, email?: string) {
    if (!token) {
      throw new BadRequestException('Reset token is required.');
    }

    const where: any = {
      type: 'PASSWORD_RESET',
      expiresAt: { gt: new Date() },
    };
    if (email) {
      where.email = email.toLowerCase().trim();
    }

    let record = await this.prisma.otpVerification.findFirst({
      where: {
        ...where,
        otp: token.trim(),
      },
    });

    if (!record) {
      // Check fallback OTP in payload
      const allActive = await this.prisma.otpVerification.findMany({ where });
      record = allActive.find((r) => {
        try {
          const parsed = r.payload ? JSON.parse(r.payload) : {};
          return parsed.otp === token.trim();
        } catch {
          return false;
        }
      }) || null;
    }

    if (!record) {
      return {
        valid: false,
        message: 'This password reset magic link is invalid or has expired. Please request a new one.',
      };
    }

    return {
      valid: true,
      email: record.email,
      expiresAt: record.expiresAt,
    };
  }

  // ----------------------------------------------------------------------------
  // 7. PASSWORD RESET STEP 2: VERIFY & SET NEW PASSWORD
  // ----------------------------------------------------------------------------
  async verifyPasswordReset(dto: PasswordResetVerifyDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const resetToken = (dto.token || dto.otp || '').trim();
    if (!resetToken) {
      throw new BadRequestException('Password reset token or verification code is required');
    }

    const where: any = {
      type: 'PASSWORD_RESET',
      expiresAt: { gt: new Date() },
    };
    if (dto.email) {
      where.email = dto.email.toLowerCase().trim();
    }

    let record = await this.prisma.otpVerification.findFirst({
      where: {
        ...where,
        otp: resetToken,
      },
    });

    if (!record) {
      const allActive = await this.prisma.otpVerification.findMany({ where });
      record = allActive.find((r) => {
        try {
          const parsed = r.payload ? JSON.parse(r.payload) : {};
          return parsed.otp === resetToken;
        } catch {
          return false;
        }
      }) || null;
    }

    if (!record) {
      throw new BadRequestException('Invalid or expired password reset link. Please request a new link.');
    }

    const normalizedEmail = record.email;
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // Hash new password with argon2
    const newPasswordHash = await argon2.hash(dto.newPassword);

    // Update password and invalidate all existing active sessions
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
      },
    });

    // Cleanup OTP
    await this.prisma.otpVerification.delete({ where: { id: record.id } });

    return {
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      email: normalizedEmail,
    };
  }

  // ----------------------------------------------------------------------------
  // 8. GET CURRENT USER PROFILE
  // ----------------------------------------------------------------------------
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      user: this.sanitizeUser(user),
    };
  }

  // ----------------------------------------------------------------------------
  // HELPER METHODS
  // ----------------------------------------------------------------------------
  private async generateTokens(userId: string, email: string, role: Role) {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'dealflow360_access_secret_super_secure_key_2026';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dealflow360_refresh_secret_ultra_secure_key_2026';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret: accessSecret, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret: refreshSecret, expiresIn: '7d' },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, ...sanitized } = user;
    return sanitized;
  }
}
