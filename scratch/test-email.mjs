import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env.local') });

async function testEmail() {
  const host = process.env.NODEMAILER_HOST;
  const port = parseInt(process.env.NODEMAILER_PORT || '587', 10);
  const user = process.env.NODEMAILER_USER;
  const pass = process.env.NODEMAILER_PASS;
  const from = process.env.NODEMAILER_FROM || `"The Tote Life Studio" <no-reply@thetotelife.com>`;

  console.log('Testing SMTP connection with settings:', { host, port, user, from });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: 'chrissyyebs215@gmail.com',
      subject: '[The Tote Life] Test OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Brand Email OTP Test</h2>
          <p>Sender shown in inbox: <strong>The Tote Life Studio</strong> &lt;no-reply@thetotelife.com&gt;</p>
          <p>Your verification code is: <strong style="font-size: 24px; color: #81511F;">910283</strong></p>
        </div>
      `
    });
    console.log('SUCCESS! Email sent:', info.messageId);
  } catch (err) {
    console.error('ERROR sending email:', err);
  }
}

testEmail();
