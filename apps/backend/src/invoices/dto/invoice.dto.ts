import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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

export class CreateRazorpayOrderDto {
  @ApiPropertyOptional({ example: 'INR', default: 'INR', description: 'Currency code (default INR)' })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ example: 'order_PY1234abcd', description: 'Razorpay Order ID' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_PY1234abcd', description: 'Razorpay Payment ID' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'abc123signature', description: 'Razorpay HMAC signature' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
