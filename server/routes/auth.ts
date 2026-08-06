// ============================================================
// Auth Routes
// Pre-signup validation, OTP verification, DB User Registration, Login & Password Reset
// ============================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Webhook } from 'svix';
import { badRequest } from '../middleware/errorHandler.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import { 
  findUserByEmail, 
  createUser, 
  verifyUserCredentials, 
  updateUserPassword,
  deleteUserByEmail 
} from '../services/user.service.js';
import { generateOTP, verifyOTP } from '../services/otp.service.js';
import { sendOTPEmail } from '../services/email.service.js';

const router = Router();

// Validation schema for pre-signup checks
const signupValidationSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .regex(/^[A-Za-z\s]+$/, 'Full name must contain letters and spaces only (no digits or symbols)'),
    email: z
      .string()
      .email('Invalid email address')
      .refine((val) => val.toLowerCase().endsWith('@gmail.com'), {
        message: 'Email must be a @gmail.com address',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
    confirmPassword: z.string(),
    phone: z
      .string()
      .regex(/^\d{10}$/, 'Phone number must contain exactly 10 digits'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * POST /api/auth/validate-signup
 * Pre-validation route before frontend sends OTP
 */
router.post('/validate-signup', authLimiter, async (req, res, next) => {
  try {
    const parsed = signupValidationSchema.safeParse(req.body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      throw badRequest(firstError);
    }

    // Check if user already exists
    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      throw badRequest('An account with this email address already exists. Please log in instead.');
    }

    res.json({
      valid: true,
      message: 'Sign-up details are valid',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/send-otp
 * Generates and emails a 6-digit OTP code using CSPRNG
 */
router.post('/send-otp', otpLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email().refine((val) => val.toLowerCase().endsWith('@gmail.com'), {
        message: 'Email must be a @gmail.com address',
      }),
      purpose: z.enum(['signup_verification', 'password_reset']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid request parameters');
    }

    const { email, purpose } = parsed.data;

    // Strict account existence check based on purpose
    const existingUser = await findUserByEmail(email);

    if (purpose === 'signup_verification' && existingUser) {
      throw badRequest('An account with this email address already exists. Please log in instead.');
    }

    if (purpose === 'password_reset' && !existingUser) {
      throw badRequest('No registered account found with this email address. Please check your email or sign up.');
    }

    const { code } = await generateOTP(email, purpose);
    
    // Log OTP in development console for easy testing
    console.log(`[OTP Dev Log] Sent OTP code "${code}" to ${email} (Purpose: ${purpose})`);

    try {
      await sendOTPEmail({ to: email, code, purpose });
    } catch (emailErr) {
      console.warn('[Auth] Email sending warning:', emailErr);
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email address',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies submitted 6-digit OTP code
 */
router.post('/verify-otp', otpLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().length(6, 'Verification code must be 6 digits'),
      purpose: z.enum(['signup_verification', 'password_reset']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid verification request');
    }

    const { email, code, purpose } = parsed.data;

    const result = await verifyOTP(email, code, purpose);
    if (!result.success) {
      throw badRequest(result.message || 'OTP verification failed');
    }

    res.json({
      success: true,
      message: 'Verification successful',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Completes user registration in DB after OTP verification
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1, 'Full name is required'),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().regex(/^\d{10}$/),
      otpCode: z.string().length(6),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid registration payload');
    }

    const { fullName, email, password, phone, otpCode } = parsed.data;

    // Verify OTP code first
    const otpResult = await verifyOTP(email, otpCode, 'signup_verification');
    if (!otpResult.success) {
      throw badRequest(otpResult.message || 'Verification code invalid or expired');
    }

    // Check if already registered
    const existing = await findUserByEmail(email);
    if (existing) {
      throw badRequest('An account with this email address already exists');
    }

    // Create user in DB with bcrypt hash
    const newUser = await createUser({
      fullName,
      email,
      password,
      phone,
    });

    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        joinedAt: newUser.created_at.split('T')[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Validates user credentials against DB
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Please enter a valid email address'),
      password: z.string().min(1, 'Password is required'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid login details');
    }

    const { email, password } = parsed.data;

    // Find registered user in DB
    const user = await findUserByEmail(email);
    if (!user) {
      throw badRequest('Account not registered. Please create an account first.');
    }

    if (!user.is_active) {
      throw badRequest('This account has been deactivated. Please contact support.');
    }

    // Verify bcrypt password hash
    const isValidPassword = await verifyUserCredentials(user, password);
    if (!isValidPassword) {
      throw badRequest('Incorrect email or password.');
    }

    res.json({
      success: true,
      message: 'Log in successful',
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        joinedAt: user.created_at ? user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Resets user password after successful OTP verification
 */
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
      newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid password reset input');
    }

    const { email, code, newPassword } = parsed.data;

    // Check registered user existence
    const user = await findUserByEmail(email);
    if (!user) {
      throw badRequest('No registered account found with this email address.');
    }

    const result = await verifyOTP(email, code, 'password_reset');
    if (!result.success) {
      throw badRequest(result.message || 'Invalid or expired reset code');
    }

    // Update password hash in DB
    await updateUserPassword(email, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/clerk-webhook
 */
router.post('/clerk-webhook', async (req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[ClerkWebhook] CLERK_WEBHOOK_SECRET is not configured');
      res.status(500).json({ error: true, message: 'Webhook secret missing' });
      return;
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: true, message: 'Missing Svix headers' });
      return;
    }

    const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const wh = new Webhook(webhookSecret);

    let event: any;
    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err: any) {
      console.error('[ClerkWebhook] Signature verification failed:', err.message);
      res.status(400).json({ error: true, message: 'Invalid webhook signature' });
      return;
    }

    if (event.type === 'user.created') {
      const userData = event.data;
      const userId = userData.id;

      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const primaryEmailObj = userData.email_addresses?.find(
        (e: any) => e.id === userData.primary_email_address_id
      );
      const email = primaryEmailObj ? primaryEmailObj.email_address : '';

      const isNameValid = /^[A-Za-z\s]+$/.test(fullName) && fullName.length > 0;
      const isEmailValid = email.toLowerCase().endsWith('@gmail.com');

      if (!isNameValid || !isEmailValid) {
        console.warn(
          `[ClerkWebhook] Non-compliant user created (ID: ${userId}, Name: "${fullName}", Email: "${email}"). Deleting account server-side...`
        );

        const clerkSecretKey = process.env.CLERK_SECRET_KEY;
        if (clerkSecretKey) {
          const deleteResp = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResp.ok) {
            console.log(`[ClerkWebhook] Non-compliant user ${userId} deleted successfully.`);
          } else {
            console.error(`[ClerkWebhook] Failed to delete user ${userId}:`, await deleteResp.text());
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/delete-account
 * Permanently deletes a user account after confirmation word validation
 */
router.post('/delete-account', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1, 'Password is required for account deletion'),
      confirmationWord: z.string().min(1, 'Confirmation word is required'),
      expectedWord: z.string().min(1, 'Expected word is required'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Invalid deletion request');
    }

    const { email, password, confirmationWord, expectedWord } = parsed.data;

    // Verify the confirmation word matches
    if (confirmationWord.toLowerCase().trim() !== expectedWord.toLowerCase().trim()) {
      throw badRequest('Confirmation word does not match. Account deletion cancelled.');
    }

    // Find the user
    const user = await findUserByEmail(email);
    if (!user) {
      throw badRequest('Account not found.');
    }

    // Verify password before deletion
    const isValidPassword = await verifyUserCredentials(user, password);
    if (!isValidPassword) {
      throw badRequest('Incorrect password. Account deletion cancelled for security.');
    }

    // Permanently delete the account
    const deleted = await deleteUserByEmail(email);
    if (!deleted) {
      throw badRequest('Failed to delete account. Please try again.');
    }

    console.log(`[Auth] Account permanently deleted: ${email}`);

    res.json({
      success: true,
      message: 'Your account has been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
});

export const authRouter = router;
