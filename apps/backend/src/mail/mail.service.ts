import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`📧 SMTP configured: ${host}:${port}`);
    } else {
      this.logger.warn('⚠️ SMTP credentials not set. OTPs are logged directly to the server console.');
    }
  }

  async sendOtpEmail(to: string, otp: string, type: 'SIGNUP' | 'PASSWORD_RESET'): Promise<boolean> {
    const subject = type === 'SIGNUP'
      ? 'Verify your email - DealFlow360'
      : 'Password Reset Code - DealFlow360';

    const actionText = type === 'SIGNUP'
      ? 'Thank you for signing up with DealFlow360. Please enter the 6-digit verification code below to verify your email and complete your registration:'
      : 'We received a request to reset your password. Enter the 6-digit verification code below to set a new password:';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">DealFlow360</h2>
        <p style="font-size: 15px; color: #334155;">${actionText}</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background-color: #f1f5f9; padding: 12px 24px; border-radius: 6px; border: 1px dashed #94a3b8;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">DealFlow360 — Intelligent Sales Operations Platform</p>
      </div>
    `;

    // Always log with high-visibility banner for testing
    console.log('\n======================================================');
    console.log(`🔑 [DealFlow360 AUTH OTP]`);
    console.log(`📬 To:      ${to}`);
    console.log(`📋 Type:    ${type}`);
    console.log(`⚡ OTP:     ${otp}`);
    console.log(`⏰ Expiry:  10 Minutes`);
    console.log('======================================================\n');

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'DealFlow360 <no-reply@dealflow360.com>',
          to,
          subject,
          html,
        });
        this.logger.log(`✅ OTP email sent to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(`❌ SMTP send error for ${to}: ${err.message}`);
        return true;
      }
    }

    return true;
  }
}
