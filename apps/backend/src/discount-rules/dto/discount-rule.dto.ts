import { ApiProperty } from '@nestjs/swagger';
import { CustomerTier, ProductCategory, RiskLevel } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTierCeilingDto {
  @ApiProperty({ enum: CustomerTier, example: CustomerTier.GOLD })
  @IsEnum(CustomerTier)
  @IsNotEmpty()
  tier: CustomerTier;

  @ApiProperty({ example: 15.0, description: 'Maximum allowed discount % for this tier' })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscount: number;
}

export class UpdateCategoryCeilingDto {
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.SERVICES })
  @IsEnum(ProductCategory)
  @IsNotEmpty()
  category: ProductCategory;

  @ApiProperty({ example: 10.0, description: 'Maximum allowed discount % for this product category' })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscount: number;
}

export class UpdateApprovalMatrixDto {
  @ApiProperty({ enum: RiskLevel, example: RiskLevel.MEDIUM })
  @IsEnum(RiskLevel)
  @IsNotEmpty()
  riskLevel: RiskLevel;

  @ApiProperty({ example: true })
  @IsBoolean()
  requiresManagerApproval: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  requiresFinanceApproval: boolean;

  @ApiProperty({ example: 'Over limit, blended risk medium' })
  @IsString()
  description: string;
}

export class ValidateDiscountLineDto {
  @ApiProperty({ enum: CustomerTier, example: CustomerTier.GOLD, description: 'Customer account tier' })
  @IsEnum(CustomerTier)
  @IsNotEmpty()
  customerTier: CustomerTier;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.SERVICES, description: 'Product category' })
  @IsEnum(ProductCategory)
  @IsNotEmpty()
  category: ProductCategory;

  @ApiProperty({ example: 18.0, description: 'Proposed discount percentage on quotation line' })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposedDiscount: number;
}

export class QuotationLineItemDto {
  @ApiProperty({ example: 'LAPTOP-PRO-14' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.HARDWARE })
  @IsEnum(ProductCategory)
  @IsNotEmpty()
  category: ProductCategory;

  @ApiProperty({ example: 24, description: 'Quantity' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1299.0, description: 'Base selling price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 850.0, description: 'Procurement base cost' })
  @IsNumber()
  @Min(0)
  baseCost: number;

  @ApiProperty({ example: 12.0, description: 'Proposed discount %' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;
}

export class CalculateBlendedRiskDto {
  @ApiProperty({ enum: CustomerTier, example: CustomerTier.GOLD, description: 'Customer Tier' })
  @IsEnum(CustomerTier)
  @IsNotEmpty()
  customerTier: CustomerTier;

  @ApiProperty({ type: [QuotationLineItemDto], description: 'List of order lines across mixed categories' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lines: QuotationLineItemDto[];
}

export class UpdateDiscountRulesBatchDto {
  @ApiProperty({ enum: CustomerTier, required: false })
  @IsEnum(CustomerTier)
  @IsOptional()
  tier?: CustomerTier;

  @ApiProperty({ enum: ProductCategory, required: false })
  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @ApiProperty({ example: 12.5, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDiscountPercent?: number;

  @ApiProperty({ example: 12.5, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDiscount?: number;

  @ApiProperty({ enum: RiskLevel, required: false })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requiresManagerApproval?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  requiresFinanceApproval?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

