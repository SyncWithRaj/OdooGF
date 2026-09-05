import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
