import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscription Plan Governance (Screen 9 & 10, A5)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/config/subscription-plans')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'List all subscription plan templates' })
  @ApiResponse({ status: 200, description: 'List of subscription plan templates' })
  async getAllPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get subscription plan template by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan template details' })
  async getPlanById(@Param('id') id: string) {
    return this.subscriptionsService.getPlanById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new subscription plan template (Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscription plan template created' })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update subscription plan template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription plan template updated' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete subscription plan template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription plan template deleted' })
  async deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }
}
