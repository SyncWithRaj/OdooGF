import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CounterProposalDto {
  @ApiProperty({ example: 12.0, description: 'Customer proposed counter-discount percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  counterDiscountProposed: number;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z', description: 'Requested delivery date' })
  @IsDateString()
  @IsOptional()
  requestedDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'We would like to move forward if you can match 12% discount.' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class AcceptQuoteDto {
  @ApiPropertyOptional({ example: 'Standard terms accepted on behalf of Acme Enterprises.' })
  @IsString()
  @IsOptional()
  acknowledgementNote?: string;
}

export class PortalCommentDto {
  @ApiProperty({ example: 'Can we schedule delivery for next Monday?' })
  @IsString()
  message: string;
}
