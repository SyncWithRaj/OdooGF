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
import { InvoiceQueryDto, PayInvoiceDto, VerifyRazorpayPaymentDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices & Payments (Screens 12 & 13, B9)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate-from-quotation/:quotationId')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE, Role.SALES_REP)
  @ApiOperation({ summary: 'Generate split invoices (One-Time and Recurring) from confirmed quote' })
  @ApiResponse({ status: 201, description: 'Split invoices and subscription contracts generated' })
  async generateFromQuote(@Param('quotationId') quotationId: string) {
    return this.invoicesService.generateSplitInvoicesFromQuotation(quotationId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE, Role.SALES_REP)
  @ApiOperation({ summary: 'List all invoices with status and customer filters' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async getAll(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.getAllInvoices(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE, Role.SALES_REP, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get invoice details and payment history' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async getById(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Post(':id/pay')
  @Roles(Role.ADMIN, Role.FINANCE, Role.CUSTOMER, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Record payment for invoice (marks PAID when balance cleared)' })
  @ApiResponse({ status: 200, description: 'Payment recorded' })
  async payInvoice(
    @Param('id') id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.invoicesService.payInvoice(id, dto);
  }

  // --------------------------------------------------------------------------
  // RAZORPAY ENDPOINTS
  // --------------------------------------------------------------------------

  @Post(':id/razorpay/order')
  @Roles(Role.ADMIN, Role.FINANCE, Role.CUSTOMER, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Create a Razorpay order for the given invoice' })
  @ApiResponse({ status: 201, description: 'Razorpay order created — use orderId + keyId to open checkout' })
  async createRazorpayOrder(@Param('id') id: string) {
    return this.invoicesService.createRazorpayOrder(id);
  }

  @Post(':id/razorpay/verify')
  @Roles(Role.ADMIN, Role.FINANCE, Role.CUSTOMER, Role.SALES_REP, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Verify Razorpay payment signature and record payment' })
  @ApiResponse({ status: 200, description: 'Signature verified, payment recorded, invoice marked PAID' })
  async verifyRazorpayPayment(
    @Param('id') id: string,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    return this.invoicesService.verifyAndRecordRazorpayPayment(id, dto);
  }
}
