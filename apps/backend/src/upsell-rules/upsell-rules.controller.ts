import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUpsellRuleDto, UpdateUpsellRuleDto } from './dto/upsell-rule.dto';
import { UpsellRulesService } from './upsell-rules.service';

@ApiTags('AI Upsell & Cross-Sell Rules (Screen 4 & B5, A6)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/config/upsell-rules')
export class UpsellRulesController {
  constructor(private readonly upsellRulesService: UpsellRulesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'List all upsell / co-purchase pairing rules' })
  @ApiQuery({ name: 'baseProductId', required: false, description: 'Filter by base product ID' })
  @ApiResponse({ status: 200, description: 'List of upsell rules' })
  async getAllRules(@Query('baseProductId') baseProductId?: string) {
    return this.upsellRulesService.getAllRules(baseProductId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get upsell rule by ID' })
  @ApiResponse({ status: 200, description: 'Upsell rule details' })
  async getRuleById(@Param('id') id: string) {
    return this.upsellRulesService.getRuleById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new upsell pairing rule (Admin only)' })
  @ApiResponse({ status: 201, description: 'Upsell rule created' })
  async createRule(@Body() dto: CreateUpsellRuleDto) {
    return this.upsellRulesService.createRule(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update upsell pairing rule (Admin only)' })
  @ApiResponse({ status: 200, description: 'Upsell rule updated' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateUpsellRuleDto,
  ) {
    return this.upsellRulesService.updateRule(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete upsell pairing rule (Admin only)' })
  @ApiResponse({ status: 200, description: 'Upsell rule deleted' })
  async deleteRule(@Param('id') id: string) {
    return this.upsellRulesService.deleteRule(id);
  }
}
