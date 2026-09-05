import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringInterval, SubscriptionStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'Customer migrated to enterprise plan or cancelled services' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class AdjustQuantityDto {
  @ApiProperty({ example: 15, description: 'New total quantity/units' })
  @IsNumber()
  @Min(1)
  newQuantity: number;

  @ApiPropertyOptional({ example: 'Client hired 5 additional sales engineers' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SubscriptionContractQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: RecurringInterval })
  @IsEnum(RecurringInterval)
  @IsOptional()
  cycle?: RecurringInterval;

  @ApiPropertyOptional({ example: 'cust-uuid-1' })
  @IsUUID()
  @IsOptional()
  customerId?: string;
}

export class CreateSubscriptionContractDto {
  @ApiProperty({ example: 'cust-uuid-1' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 'quote-uuid-1' })
  @IsUUID()
  quotationId: string;

  @ApiProperty({ example: 'Enterprise Cloud License' })
  @IsString()
  planName: string;

  @ApiProperty({ enum: RecurringInterval, default: RecurringInterval.MONTHLY })
  @IsEnum(RecurringInterval)
  cycle: RecurringInterval;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  amount: number;
}

