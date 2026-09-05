import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay = require('razorpay');

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order for an invoice.
   * Amount must be in the smallest currency unit (paise for INR).
   */
  async createOrder(invoiceId: string, amountInRupees: number, currency = 'INR') {
    const amountInPaise = Math.round(amountInRupees * 100);

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `inv_${invoiceId.slice(0, 20)}`,
      notes: {
        invoiceId,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Verify the Razorpay payment signature using HMAC SHA256.
   */
  verifySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature — possible tampering detected');
    }

    return true;
  }
}
