import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, RecurringInterval } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'LAPTOP-PRO-14', description: 'Unique SKU code' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Laptop Pro 14', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'High performance 14-inch developer laptop', description: 'Product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.HARDWARE })
  @IsEnum(ProductCategory)
  @IsNotEmpty()
  category: ProductCategory;

  @ApiPropertyOptional({ example: 'Each', default: 'Each' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 850.0, description: 'Internal base manufacturing/procurement cost' })
  @IsNumber()
  @Min(0)
  baseCost: number;

  @ApiProperty({ example: 1299.0, description: 'Standard base selling price' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 18.0, default: 18.0 })
  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isSubscription?: boolean;

  @ApiPropertyOptional({ enum: RecurringInterval, example: RecurringInterval.MONTHLY })
  @IsEnum(RecurringInterval)
  @IsOptional()
  recurringInterval?: RecurringInterval;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPromoted?: boolean;

  @ApiPropertyOptional({ example: 20.0, default: 20.0, description: 'Minimum acceptable profit margin %' })
  @IsNumber()
  @IsOptional()
  minMarginThreshold?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Laptop Pro 14 v2' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @ApiPropertyOptional({ example: 890.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseCost?: number;

  @ApiPropertyOptional({ example: 1349.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 18.0 })
  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPromoted?: boolean;

  @ApiPropertyOptional({ example: 25.0 })
  @IsNumber()
  @IsOptional()
  minMarginThreshold?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateVariantDto {
  @ApiProperty({ example: 'RAM', description: 'Attribute name (e.g. RAM, Storage, Color)' })
  @IsString()
  @IsNotEmpty()
  attribute: string;

  @ApiProperty({ example: '32GB', description: 'Attribute value (e.g. 32GB, 1TB, Black)' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ example: 150.0, description: 'Price premium added to base price' })
  @IsNumber()
  @Min(0)
  extraPrice: number;

  @ApiPropertyOptional({ example: '-32GB', description: 'Optional SKU suffix' })
  @IsString()
  @IsOptional()
  skuSuffix?: string;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @ApiPropertyOptional({ example: 'Laptop', description: 'Search term for SKU or name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter subscription products' })
  @IsOptional()
  isSubscription?: boolean | string;

  @ApiPropertyOptional({ example: true, description: 'Filter promoted products' })
  @IsOptional()
  isPromoted?: boolean | string;
}
