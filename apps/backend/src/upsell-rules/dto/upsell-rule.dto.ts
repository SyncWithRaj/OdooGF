import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateUpsellRuleDto {
  @ApiProperty({ example: 'product-uuid-1', description: 'Base product ID being purchased' })
  @IsUUID()
  baseProductId: string;

  @ApiProperty({ example: 'product-uuid-2', description: 'Recommended product ID to suggest' })
  @IsUUID()
  recommendedProductId: string;

  @ApiPropertyOptional({ example: 0.85, description: 'Affinity / co-purchase score (0.0 - 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  coPurchaseScore?: number;

  @ApiPropertyOptional({ example: 18.0, description: 'Margin delta improvement ($ or %)' })
  @IsNumber()
  @IsOptional()
  marginDeltaBoost?: number;

  @ApiPropertyOptional({ example: 'Popular Accessory', description: 'Display tag on CPQ recommendation card' })
  @IsString()
  @IsOptional()
  promotionTag?: string;
}

export class UpdateUpsellRuleDto {
  @ApiPropertyOptional({ example: 0.90 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  coPurchaseScore?: number;

  @ApiPropertyOptional({ example: 25.0 })
  @IsNumber()
  @IsOptional()
  marginDeltaBoost?: number;

  @ApiPropertyOptional({ example: 'Promo: 15% off' })
  @IsString()
  @IsOptional()
  promotionTag?: string;
}
