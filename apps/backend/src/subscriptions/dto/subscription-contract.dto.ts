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
