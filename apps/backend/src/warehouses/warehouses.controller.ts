import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import {
  CreateWarehouseDto,
  SetReplenishmentRuleDto,
  StockAdjustmentDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Warehouses & Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin creates a new warehouse facility (Dynamic CRUD)' })
  @ApiResponse({ status: 201, description: 'Warehouse registered' })
  @ApiResponse({ status: 400, description: 'Name conflict or validation error' })
  async create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'List all warehouses with aggregate inventory metrics and shipping cost weights' })
  @ApiResponse({ status: 200, description: 'Warehouses list retrieved' })
  async findAll() {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get warehouse details and product-level inventory breakdown' })
  @ApiResponse({ status: 200, description: 'Warehouse details and stock lines retrieved' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin updates warehouse details or shipping cost weight' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin deletes a warehouse facility' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }

  @Post('stock-adjustment')
  @Roles(Role.ADMIN, Role.FINANCE)
  @ApiOperation({ summary: 'Adjust physical stock levels or reserved counts (Admin / Operations / Finance)' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted' })
  @ApiResponse({ status: 400, description: 'Negative inventory violation' })
  async adjustStock(@Body() dto: StockAdjustmentDto) {
    return this.warehousesService.adjustStock(dto);
  }

  @Post('replenishment-rule')
  @Roles(Role.ADMIN, Role.FINANCE)
  @ApiOperation({ summary: 'Configure minimum stock replenishment thresholds per warehouse' })
  @ApiResponse({ status: 200, description: 'Replenishment rule configured' })
  async setReplenishmentRule(@Body() dto: SetReplenishmentRuleDto) {
    return this.warehousesService.setReplenishmentRule(dto);
  }
}
