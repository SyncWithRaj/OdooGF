import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerTier } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Customer contact or business name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'procurement@acmecorp.com', description: 'Customer unique email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1-555-0199' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Enterprises Inc' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: CustomerTier, example: CustomerTier.GOLD, default: CustomerTier.BRONZE })
  @IsEnum(CustomerTier)
  @IsOptional()
  tier?: CustomerTier;

  @ApiPropertyOptional({ example: 'uuid-of-sales-rep', description: 'Assigned Sales Rep User ID' })
  @IsString()
  @IsOptional()
  assignedRepId?: string;

  @ApiPropertyOptional({ example: 8.0, default: 8.0, description: 'Historical average discount percentage' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  historicalAvgDisc?: number;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Acme Global Corp' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '+1-555-9999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Enterprises Global LLC' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: CustomerTier, example: CustomerTier.GOLD })
  @IsEnum(CustomerTier)
  @IsOptional()
  tier?: CustomerTier;

  @ApiPropertyOptional({ example: 'uuid-of-sales-rep' })
  @IsString()
  @IsOptional()
  assignedRepId?: string;

  @ApiPropertyOptional({ example: 9.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  historicalAvgDisc?: number;
}

export class CustomerQueryDto {
  @ApiPropertyOptional({ enum: CustomerTier, description: 'Filter by customer tier' })
  @IsEnum(CustomerTier)
  @IsOptional()
  tier?: CustomerTier;

  @ApiPropertyOptional({ example: 'Acme', description: 'Search name, email, or company' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-sales-rep', description: 'Filter by assigned rep' })
  @IsString()
  @IsOptional()
  assignedRepId?: string;
}
