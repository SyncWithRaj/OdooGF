import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse', description: 'Unique warehouse name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Chicago, IL (Central Hub)', description: 'Physical geographic location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: 1.0, default: 1.0, description: 'Weight factor for shipment cost calculation' })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  shippingCostWeight?: number;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'Main Logistics Hub' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Chicago Central, IL' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 1.1 })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  shippingCostWeight?: number;
}

export class StockAdjustmentDto {
  @ApiProperty({ example: 'uuid-of-warehouse', description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'uuid-of-product', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50, description: 'Stock quantity to add (positive) or deduct (negative)' })
  @IsNumber()
  @IsNotEmpty()
  deltaInStock: number;

  @ApiPropertyOptional({ example: 0, description: 'Reserved stock delta' })
  @IsNumber()
  @IsOptional()
  deltaReserved?: number;

  @ApiPropertyOptional({ example: 'Manual cycle count restock', description: 'Audit reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SetReplenishmentRuleDto {
  @ApiProperty({ example: 'uuid-of-warehouse', description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'uuid-of-product', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 15, description: 'Minimum stock alert trigger point' })
  @IsNumber()
  @Min(0)
  minStockLevel: number;

  @ApiProperty({ example: 60, description: 'Batch quantity to order upon replenishment trigger' })
  @IsNumber()
  @Min(1)
  reorderQuantity: number;
}

