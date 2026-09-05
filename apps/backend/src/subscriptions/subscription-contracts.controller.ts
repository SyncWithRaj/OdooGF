import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AdjustQuantityDto,
  CancelSubscriptionDto,
  SubscriptionContractQueryDto,
} from './dto/subscription-contract.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Live Subscription Contracts & Proration (Screens 9 & 10, B10)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/subscriptions')
export class SubscriptionContractsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'List all active customer subscription contracts' })
  @ApiResponse({ status: 200, description: 'List of subscription contracts' })
  async getAll(@Query() query: SubscriptionContractQueryDto) {
    return this.subscriptionsService.getAllSubscriptions(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get subscription contract details with proration history' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getById(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriptionById(id);
  }

  @Post(':id/pause')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Pause subscription billing' })
  @ApiResponse({ status: 200, description: 'Subscription paused' })
  async pause(@Param('id') id: string) {
    return this.subscriptionsService.pauseSubscription(id);
  }

  @Post(':id/resume')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Resume paused subscription' })
  @ApiResponse({ status: 200, description: 'Subscription resumed' })
  async resume(@Param('id') id: string) {
    return this.subscriptionsService.resumeSubscription(id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Cancel subscription contract with automatic proration refund' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled and prorated refund logged' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(id, dto);
  }

  @Post([':id/adjust-quantity', ':id/modify'])
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Upgrade/downgrade subscription seats with mid-cycle proration delta (/modify alias)' })
  @ApiResponse({ status: 200, description: 'Quantity adjusted and prorated charge logged' })
  async adjustQuantity(
    @Param('id') id: string,
    @Body() dto: AdjustQuantityDto,
  ) {
    return this.subscriptionsService.adjustQuantity(id, dto);
  }
}
