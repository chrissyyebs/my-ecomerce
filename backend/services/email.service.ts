// ============================================================
// Email Service
// Nodemailer transport for OTP, order confirmation, status updates
// ============================================================

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.NODEMAILER_HOST;
  const port = parseInt(process.env.NODEMAILER_PORT || '587', 10);
  const user = process.env.NODEMAILER_USER;
  const pass = process.env.NODEMAILER_PASS;

  if (!host || !user || !pass) {
    console.warn('[EmailService] SMTP credentials not configured — emails will fail');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

function getFromAddress(): string {
  if (process.env.NODEMAILER_FROM) return process.env.NODEMAILER_FROM;
  if (process.env.NODEMAILER_USER) return `"The Tote Life" <${process.env.NODEMAILER_USER}>`;
  return 'The Tote Life <noreply@thetotelife.com>';
}

/**
 * Send a generic email.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const host = process.env.NODEMAILER_HOST;
    if (!host) {
      console.warn('[EmailService] NODEMAILER_HOST not configured. Email simulation mode active.');
      return;
    }

    await getTransporter().sendMail({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err: any) {
    console.warn('[EmailService] Failed to send email via SMTP (falling back to dev console logging):', err?.message || err);
  }
}

/**
 * Send a 6-digit OTP email for signup verification or password reset.
 */
export async function sendOTPEmail(params: {
  to: string;
  code: string;
  purpose: 'signup_verification' | 'password_reset';
}): Promise<void> {
  const isSignup = params.purpose === 'signup_verification';
  const title = isSignup ? 'Verify Your Tote Life Account' : 'Reset Your Tote Life Password';
  const actionText = isSignup
    ? 'Use the 6-digit code below to complete your registration:'
    : 'Use the 6-digit code below to reset your password:';

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #ffffff; color: #1a1a1a; border-radius: 12px; border: 1px solid #eee;">
      <h2 style="color: #81511F; margin-top: 0;">${title}</h2>
      <p style="font-size: 14px; color: #555;">${actionText}</p>
      <div style="background: #FAF7F2; border: 1px border #81511F; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #81511F;">${params.code}</span>
      </div>
      <p style="font-size: 12px; color: #888;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;" />
      <p style="font-size: 11px; color: #aaa; text-align: center;">— The Tote Life Studio</p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: `[The Tote Life] ${params.code} is your verification code`,
    html,
  });
}

/**
 * Send an order confirmation email.
 */
export async function sendOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  items: { name: string; quantity: number; price: number }[];
  deliveryMethod: string;
}): Promise<void> {
  const itemRows = params.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">GH₵${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 24px; color: #81511F;">Thank you, ${params.customerName}!</h1>
      <p style="color: #666; font-size: 14px;">Your order has been confirmed.</p>
      
      <div style="background: #FAF7F2; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #666;">Order ID</p>
        <p style="margin: 4px 0 0; font-weight: 600;">${params.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Item</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 8px; font-weight: 600;">Total</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #81511F;">GH₵${params.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <p style="font-size: 12px; color: #999; margin-top: 24px;">
        Delivery: ${params.deliveryMethod === 'door' ? 'Door Delivery (3-5 business days)' : 'Store Pickup (same day)'}
      </p>
      
      <p style="font-size: 12px; color: #999; margin-top: 16px;">
        — The Tote Life Team
      </p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: `Order Confirmed — #${params.orderId.slice(0, 8).toUpperCase()}`,
    html,
  });
}

/**
 * Send an order status update email.
 */
export async function sendStatusUpdate(params: {
  to: string;
  customerName: string;
  orderId: string;
  newStatus: string;
}): Promise<void> {
  const statusLabels: Record<string, string> = {
    paid: 'Payment Confirmed',
    processing: 'Being Prepared',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 24px; color: #81511F;">Order Update</h1>
      <p>Hi ${params.customerName},</p>
      <p>Your order <strong>#${params.orderId.slice(0, 8).toUpperCase()}</strong> is now: 
        <strong style="color: #81511F;">${statusLabels[params.newStatus] || params.newStatus}</strong>
      </p>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">— The Tote Life Team</p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: `Order #${params.orderId.slice(0, 8).toUpperCase()} — ${statusLabels[params.newStatus] || params.newStatus}`,
    html,
  });
}
