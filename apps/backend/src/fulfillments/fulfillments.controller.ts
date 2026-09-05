import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FulfillmentStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  DispatchFulfillmentDto,
  ManualOverrideFulfillmentDto,
} from './dto/fulfillment.dto';
import { FulfillmentsService } from './fulfillments.service';

@ApiTags('Fulfillment & Multi-Warehouse Split (Screens 7 & 8, B6, B7)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/fulfillments')
export class FulfillmentsController {
  constructor(private readonly fulfillmentsService: FulfillmentsService) {}

  @Post('quotation/:quotationId/split')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Calculate and trigger intelligent multi-warehouse inventory split' })
  @ApiResponse({ status: 201, description: 'Fulfillment order and split allocations created' })
  async splitQuotation(@Param('quotationId') quotationId: string) {
    return this.fulfillmentsService.calculateAndCreateSplit(quotationId);
  }

  @Get('quotation/:quotationId')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get fulfillment order and split details for a quotation' })
  @ApiResponse({ status: 200, description: 'Fulfillment order details' })
  async getByQuotationId(@Param('quotationId') quotationId: string) {
    return this.fulfillmentsService.getFulfillmentByQuotationId(quotationId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'List all fulfillment orders' })
  @ApiQuery({ name: 'status', required: false, enum: FulfillmentStatus })
  @ApiQuery({ name: 'hasBackorder', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of fulfillment orders' })
  async getAll(
    @Query('status') status?: FulfillmentStatus,
    @Query('hasBackorder') hasBackorder?: boolean,
  ) {
    return this.fulfillmentsService.getAllFulfillments({
      status,
      hasBackorder,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get fulfillment order details by ID' })
  @ApiResponse({ status: 200, description: 'Fulfillment order details' })
  async getById(@Param('id') id: string) {
    return this.fulfillmentsService.getFulfillmentById(id);
  }

  @Patch(':id/override')
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Manual override of warehouse item allocations' })
  @ApiResponse({ status: 200, description: 'Fulfillment order updated with manual split' })
  async manualOverride(
    @Param('id') id: string,
    @Body() dto: ManualOverrideFulfillmentDto,
  ) {
    return this.fulfillmentsService.manualOverride(id, dto);
  }

  @Post(':id/dispatch')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Dispatch shipments and deduct physical warehouse inventory' })
  @ApiResponse({ status: 200, description: 'Dispatch confirmation and updated stock' })
  async dispatch(
    @Param('id') id: string,
    @Body() dto: DispatchFulfillmentDto,
  ) {
    return this.fulfillmentsService.dispatchFulfillment(id, dto);
  }

  @Post(':id/consolidate-backorder')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'B6 Special Flow: Consolidate remaining backorders when new warehouse stock arrives' })
  @ApiResponse({ status: 200, description: 'Backorders consolidated into active shipments' })
  async consolidateBackorder(@Param('id') id: string) {
    return this.fulfillmentsService.consolidateRemainingBackorders(id);
  }
}
