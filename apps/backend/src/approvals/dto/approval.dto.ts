import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction, ApprovalStage, RiskLevel } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ActionApprovalDto {
  @ApiProperty({
    enum: [
      ApprovalAction.APPROVED,
      ApprovalAction.RETURNED_FOR_REVISION,
      ApprovalAction.REJECTED,
    ],
    example: ApprovalAction.APPROVED,
    description: 'Decision action on this approval request',
  })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiPropertyOptional({
    example: 'Approved based on strategic account relationship and high volume.',
    description: 'Mandatory or optional justification notes logged into audit trail',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ApprovalQueueQueryDto {
  @ApiPropertyOptional({ enum: ApprovalStage })
  @IsEnum(ApprovalStage)
  @IsOptional()
  stage?: ApprovalStage;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
