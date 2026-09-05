import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, CreateVariantDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Products & Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Create new catalog product (Admin / Sales Manager)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'SKU conflict or invalid payload' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'List active catalog products with live aggregated warehouse stock' })
  @ApiResponse({ status: 200, description: 'Products catalog retrieved' })
  async findAll(
    @Query() query: ProductQueryDto,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.productsService.findAll(query, userRole);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get product details, variants, warehouse stock, and upsell pairings' })
  @ApiResponse({ status: 200, description: 'Product details retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.productsService.findOne(id, userRole);
  }

  @Put(':id')
  @Patch(':id')
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Update product pricing, margin threshold or details (Admin / Sales Manager)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate catalog product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/variants')
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Add product variant (e.g. RAM, Storage, Color) with extra price' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  async addVariant(
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.addVariant(id, dto);
  }

  @Delete(':id/variants/:variantId')
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiResponse({ status: 200, description: 'Variant removed' })
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.removeVariant(id, variantId);
  }
}
