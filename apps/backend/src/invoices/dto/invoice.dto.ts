import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PayInvoiceDto {
  @ApiProperty({ example: 6192.0, description: 'Amount being paid' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Bank Transfer', default: 'Bank Transfer' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'TXN-WIRE-98421', description: 'Payment reference or transaction hash' })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  @IsOptional()
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({ example: 'cust-uuid-1' })
  @IsUUID()
  @IsOptional()
  customerId?: string;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ example: 'order_XXXXXXXXXXXXXXXXXX', description: 'Razorpay Order ID returned from create-order' })
  @IsString()
  razorpay_order_id: string;

  @ApiProperty({ example: 'pay_XXXXXXXXXXXXXXXXXX', description: 'Razorpay Payment ID from checkout callback' })
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ example: 'abc123...', description: 'HMAC-SHA256 signature from Razorpay checkout callback' })
  @IsString()
  razorpay_signature: string;
}
