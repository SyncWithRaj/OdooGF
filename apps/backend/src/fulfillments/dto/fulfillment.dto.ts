import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProposeShortageDto {
  @ApiProperty({ example: 15, description: 'Proposed partial quantity that can be fulfilled immediately' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proposedQuantity: number;
}

export class OverrideSplitItemDto {
  @ApiProperty({ example: 'wh-uuid-1', description: 'Warehouse ID fulfilling this allocation' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 'prod-uuid-1', description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5, description: 'Quantity to fulfill from this warehouse' })
  @IsNumber()
  @Min(0)
  quantityFulfilled: number;

  @ApiPropertyOptional({ example: 0, description: 'Quantity to mark backordered', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityBackordered?: number;
}

export class ManualOverrideFulfillmentDto {
  @ApiProperty({ type: [OverrideSplitItemDto], description: 'Manual allocation of items across warehouses' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideSplitItemDto)
  splitItems: OverrideSplitItemDto[];

  @ApiPropertyOptional({ example: 'Rerouted 5 units from East Depot due to emergency truck dispatch' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class DispatchFulfillmentDto {
  @ApiPropertyOptional({ example: 'BlueDart / FedEx Express Priority' })
  @IsString()
  @IsOptional()
  carrier?: string;

  @ApiPropertyOptional({ example: 'Shipment dispatched from Bay 4' })
  @IsString()
  @IsOptional()
  trackingNotes?: string;
}
