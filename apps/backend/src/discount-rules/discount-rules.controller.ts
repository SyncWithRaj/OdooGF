import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscountRulesService } from './discount-rules.service';
import {
  CalculateBlendedRiskDto,
  UpdateApprovalMatrixDto,
  UpdateCategoryCeilingDto,
  UpdateTierCeilingDto,
  ValidateDiscountLineDto,
} from './dto/discount-rule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Discount Governance & Rules (Screen 18)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/config/discount-rules')
export class DiscountRulesController {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Retrieve active discount ceilings and approval routing matrix' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getAllRules() {
    return this.discountRulesService.getAllRules();
  }

  @Post('validate-line')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Real-time calculation: validate line discount against tier and category ceilings' })
  @ApiResponse({ status: 200, description: 'Line discount compliance and badge evaluation' })
  async validateLine(@Body() dto: ValidateDiscountLineDto) {
    return this.discountRulesService.validateLine(dto);
  }

  @Post('calculate-blended-risk')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'A3 Notes: Compute Blended Risk Score across mixed categories and route to highest required level' })
  @ApiResponse({ status: 200, description: 'Blended risk score, routing stage, and financials' })
  async calculateBlendedRisk(@Body() dto: CalculateBlendedRiskDto) {
    return this.discountRulesService.calculateBlendedRisk(dto);
  }

  @Put('tier')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update customer tier discount ceiling (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tier ceiling updated' })
  async updateTierCeiling(@Body() dto: UpdateTierCeilingDto) {
    return this.discountRulesService.updateTierCeiling(dto);
  }

  @Put('category')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update product category discount ceiling (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category ceiling updated' })
  async updateCategoryCeiling(@Body() dto: UpdateCategoryCeilingDto) {
    return this.discountRulesService.updateCategoryCeiling(dto);
  }

  @Put('approval-matrix')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update approval chain requirements for risk levels (Admin only)' })
  @ApiResponse({ status: 200, description: 'Approval chain matrix updated' })
  async updateApprovalMatrix(@Body() dto: UpdateApprovalMatrixDto) {
    return this.discountRulesService.updateApprovalMatrix(dto);
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update discount rules or ceilings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Rules updated' })
  async updateRules(@Body() body: any) {
    if (body.tier && body.maxDiscountPercent !== undefined) {
      await this.discountRulesService.updateTierCeiling(body);
    }
    if (body.category && body.maxDiscountPercent !== undefined) {
      await this.discountRulesService.updateCategoryCeiling(body);
    }
    if (body.riskLevel) {
      await this.discountRulesService.updateApprovalMatrix(body);
    }
    return this.discountRulesService.getAllRules();
  }
}
