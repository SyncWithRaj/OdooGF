import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringInterval } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'MONTHLY_PRO', description: 'Unique code for the plan template' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Monthly Pro Plan', description: 'Display name of the plan' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Billed monthly with standard calendar proration' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: RecurringInterval, example: RecurringInterval.MONTHLY })
  @IsEnum(RecurringInterval)
  interval: RecurringInterval;

  @ApiPropertyOptional({ example: 5.0, description: 'Discount incentive percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'CALENDAR_DAYS', description: 'CALENDAR_DAYS or FIXED_30_DAYS' })
  @IsString()
  @IsOptional()
  prorationPolicy?: string;

  @ApiPropertyOptional({ example: 'PRORATED_REFUND', description: 'PRORATED_REFUND or NO_REFUND' })
  @IsString()
  @IsOptional()
  cancellationPolicy?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Monthly Pro Plan' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: RecurringInterval, example: RecurringInterval.MONTHLY })
  @IsEnum(RecurringInterval)
  @IsOptional()
  interval?: RecurringInterval;

  @ApiPropertyOptional({ example: 10.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'CALENDAR_DAYS' })
  @IsString()
  @IsOptional()
  prorationPolicy?: string;

  @ApiPropertyOptional({ example: 'PRORATED_REFUND' })
  @IsString()
  @IsOptional()
  cancellationPolicy?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
