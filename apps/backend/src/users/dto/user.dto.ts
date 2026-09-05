import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'priya.finance@dealflow.com', description: 'Internal user email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Priya Patel', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: Role.FINANCE,
    enum: Role,
    description: 'Internal role: ADMIN, SALES_REP, SALES_MANAGER, FINANCE, CUSTOMER',
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiPropertyOptional({ example: 'Finance Operations', description: 'Assigned team name' })
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiProperty({ example: 'TemporaryPass123!', description: 'Initial password' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Priya Patel' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.SALES_MANAGER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'Enterprise Sales' })
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiPropertyOptional({ example: '+1 (555) 012-4488' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA, US' })
  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Priya Patel' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Enterprise Sales' })
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiPropertyOptional({ example: '+1 (555) 012-4488' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA, US' })
  @IsString()
  @IsOptional()
  location?: string;
}
