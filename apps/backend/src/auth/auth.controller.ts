import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  PasswordResetInitiateDto,
  PasswordResetVerifyDto,
  RefreshTokenDto,
  SignupInitiateDto,
  SignupVerifyDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup/initiate')
  @RateLimit({ limit: 5, ttl: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Initiate signup by validating details and sending OTP email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or email already exists' })
  async initiateSignup(@Body() dto: SignupInitiateDto) {
    return this.authService.initiateSignup(dto);
  }

  @Post('signup/verify')
  @RateLimit({ limit: 5, ttl: 60 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Step 2: Verify OTP and create user with tokens' })
  @ApiResponse({ status: 201, description: 'Account verified and tokens returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifySignup(@Body() dto: SignupVerifyDto) {
    return this.authService.verifySignup(dto);
  }

  @Post('login')
  @RateLimit({ limit: 5, ttl: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email (or identifier) and password (argon2 verified)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @RateLimit({ limit: 15, ttl: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and generate new access token' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens generated' })
  @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current user refresh token session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('password-reset/initiate')
  @RateLimit({ limit: 5, ttl: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Request password reset OTP email' })
  @ApiResponse({ status: 200, description: 'Reset code dispatched if account exists' })
  async initiatePasswordReset(@Body() dto: PasswordResetInitiateDto) {
    return this.authService.initiatePasswordReset(dto);
  }

  @Post('password-reset/verify')
  @RateLimit({ limit: 5, ttl: 60 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Verify OTP and update password with argon2 hash' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or mismatched passwords' })
  async verifyPasswordReset(@Body() dto: PasswordResetVerifyDto) {
    return this.authService.verifyPasswordReset(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getCurrentUser(userId);
  }
}
