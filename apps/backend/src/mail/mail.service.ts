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
      this.transporter = nodemailer.createTransport(
        host.includes('gmail')
          ? {
              service: 'gmail',
              auth: { user, pass },
            }
          : {
              host,
              port,
              secure: port === 465,
              auth: { user, pass },
            }
      );
      this.logger.log(`SMTP service initialized: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP credentials not configured.');
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
        <h2 style="color: #18181b; margin-top: 0;">DealFlow360</h2>
        <p style="font-size: 15px; color: #334155;">${actionText}</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background-color: #f1f5f9; padding: 12px 24px; border-radius: 6px; border: 1px dashed #94a3b8;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">DealFlow360 - Intelligent Sales Operations Platform</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'DealFlow360 <no-reply@dealflow360.com>',
          to,
          subject,
          html,
        });
        this.logger.log(`OTP verification email successfully sent to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(`SMTP send error for ${to}: ${err.message}`);
        return false;
      }
    }

    return false;
  }

  async sendPasswordResetMagicLink(to: string, magicLink: string, token: string, otp?: string): Promise<boolean> {
    const subject = 'Reset Your Password - DealFlow360';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #18181b;">
        <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #f4f4f5;">
          <h2 style="font-size: 18px; font-weight: 800; color: #09090b; margin: 0; letter-spacing: -0.5px;">DealFlow360</h2>
          <span style="font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase;">Enterprise CPQ Operations</span>
        </div>
        <h3 style="font-size: 16px; font-weight: 700; color: #09090b; margin-top: 0;">Password Reset Request</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">
          We received a request to reset your DealFlow360 password for <strong>${to}</strong>. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${magicLink}" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.2px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #71717a; line-height: 1.5; margin-bottom: 6px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 11px; word-break: break-all; color: #09090b; background-color: #f4f4f5; padding: 8px 10px; border-radius: 6px; font-family: monospace;">
          ${magicLink}
        </p>
        <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px; border-top: 1px solid #f4f4f5; padding-top: 12px;">
          This link will expire in <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'DealFlow360 <no-reply@dealflow360.com>',
          to,
          subject,
          html,
        });
        this.logger.log(`Password reset magic link email successfully sent to ${to}`);
        return true;
      } catch (err) {
        this.logger.error(`SMTP send error for ${to}: ${err.message}`);
        return false;
      }
    }

    return false;
  }
}


