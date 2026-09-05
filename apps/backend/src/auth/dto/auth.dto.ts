import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, Length } from 'class-validator';
import { Role } from '@prisma/client';

export class SignupInitiateDto {
  @ApiProperty({ example: 'rahul@dealflow.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Rahul Sharma', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Confirm Password' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class SignupVerifyDto {
  @ApiProperty({ example: 'rahul@dealflow.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class LoginDto {
  @ApiProperty({ example: 'rep@dealflow.com', description: 'Email address or username identifier' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Valid refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class PasswordResetInitiateDto {
  @ApiProperty({ example: 'rep@dealflow.com', description: 'Registered email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class PasswordResetVerifyDto {
  @ApiProperty({ example: 'rep@dealflow.com', description: 'Registered email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewSecureP@ss456', description: 'New password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'NewSecureP@ss456', description: 'Confirm new password' })
  @IsString()
  @IsNotEmpty()
  confirmNewPassword: string;
}
