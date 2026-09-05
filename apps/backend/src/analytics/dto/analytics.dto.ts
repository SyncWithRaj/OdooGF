import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, QuotationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class NudgeRepDto {
  @ApiProperty({ example: 'quote-uuid-1', description: 'Target stalled quotation ID' })
  @IsUUID()
  quotationId: string;

  @ApiPropertyOptional({
    example: 'Please follow up with customer Acme regarding unconfirmed quotation terms.',
    description: 'Nudge alert message',
  })
  @IsString()
  @IsOptional()
  message?: string;
}

export class ReportFilterDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z', description: 'Period start date' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z', description: 'Period end date' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'rep-uuid-1', description: 'Filter by responsible Sales Rep' })
  @IsUUID()
  @IsOptional()
  salesRepId?: string;

  @ApiPropertyOptional({ example: 'Direct Sales', description: 'Filter by sales team' })
  @IsString()
  @IsOptional()
  teamName?: string;

  @ApiPropertyOptional({ enum: QuotationStatus, description: 'Filter by approval status' })
  @IsEnum(QuotationStatus)
  @IsOptional()
  status?: QuotationStatus;

  @ApiPropertyOptional({ enum: ProductCategory, description: 'Filter by product category' })
  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;
}
