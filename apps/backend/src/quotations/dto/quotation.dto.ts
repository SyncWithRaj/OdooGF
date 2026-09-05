import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuotationLineItemDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: 'var-uuid-1', description: 'Variant ID if product has variants' })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ example: 2, description: 'Item quantity', default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 1200.0, description: 'Override unit price (defaults to catalog basePrice)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 10.0, description: 'Line discount percent (0-100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}

export class CreateQuotationDto {
  @ApiProperty({ example: 'cust-uuid-1', description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: 'rep-uuid-1', description: 'Assigned Sales Rep ID (defaults to authenticated user)' })
  @IsUUID()
  @IsOptional()
  salesRepId?: string;

  @ApiPropertyOptional({ example: 0.0, description: 'Order-level discount percent', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  orderDiscountPercent?: number;

  @ApiPropertyOptional({ type: [QuotationLineItemDto], description: 'Initial quote lines' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  @IsOptional()
  lines?: QuotationLineItemDto[];

  @ApiPropertyOptional({ example: 'Initial draft quotation prepared for customer review' })
  @IsString()
  @IsOptional()
  initialComment?: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z', description: 'Promised or customer-requested delivery date' })
  @IsString()
  @IsOptional()
  promisedDeliveryDate?: string;
}

export class UpdateQuotationLinesDto {
  @ApiProperty({ type: [QuotationLineItemDto], description: 'List of line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lines: QuotationLineItemDto[];

  @ApiPropertyOptional({ example: 0.0, description: 'Order-level additional discount percent' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  orderDiscountPercent?: number;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z', description: 'Promised delivery date' })
  @IsString()
  @IsOptional()
  promisedDeliveryDate?: string;
}

export class AddUpsellLineDto {
  @ApiProperty({ example: 'prod-uuid-rec', description: 'Recommended product ID to add to quote' })
  @IsUUID()
  recommendedProductId: string;

  @ApiPropertyOptional({ example: 1, description: 'Quantity to add', default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 0, description: 'Promotion discount to apply', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}

export class AddCommentDto {
  @ApiProperty({ example: 'Customer requested 12% discount on laptops' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: 'line-uuid-1', description: 'Optional line ID this comment targets' })
  @IsUUID()
  @IsOptional()
  quotationLineId?: string;
}

export class SubmitQuotationDto {
  @ApiPropertyOptional({ example: 'Ready for manager review' })
  @IsString()
  @IsOptional()
  notes?: string;
}
