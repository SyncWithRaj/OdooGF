import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReportsQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter from start date (ISO string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filter until end date (ISO string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'Direct Sales',
    description: 'Filter by sales team name',
  })
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiPropertyOptional({
    example: 'usr-1234',
    description: 'Filter by specific sales rep ID',
  })
  @IsOptional()
  @IsString()
  repId?: string;
}
