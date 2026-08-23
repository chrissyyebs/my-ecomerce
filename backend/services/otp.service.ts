// ============================================================
// OTP Service
// CSPRNG generation, SHA-256 hashing at rest, 5-min expiry, attempt limits
// Robust with DB + Memory Fallback for Zero-Crash Reliability
// ============================================================

import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

export type OTPPurpose = 'signup_verification' | 'password_reset';

export interface GenerateOTPResult {
  code: string;
  expiresAt: Date;
}

export interface VerifyOTPResult {
  success: boolean;
  message?: string;
}

interface MemoryOTPRecord {
  id: string;
  email: string;
  code_hash: string;
  purpose: OTPPurpose;
  expires_at: string;
  attempt_count: number;
  consumed_at: string | null;
  created_at: string;
}

// In-memory fallback store when Supabase DB table is uninitialized or unreachable
const memoryOTPStore: MemoryOTPRecord[] = [];

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generate a 6-digit OTP using CSPRNG (`crypto.randomInt`).
 * Stores only the SHA-256 hash in `otp_codes` with in-memory fallback.
 */
export async function generateOTP(
  email: string,
  purpose: OTPPurpose
): Promise<GenerateOTPResult> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate secure 6-digit integer (100000 - 999999)
  const rawCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(rawCode);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    const { error } = await supabase.from('otp_codes').insert({
      email: normalizedEmail,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt.toISOString(),
      attempt_count: 0,
    });

    if (error) {
      console.warn('[OTP] Supabase insert warning (using fallback store):', error.message);
      memoryOTPStore.push({
        id: `mem_${Date.now()}_${Math.random()}`,
        email: normalizedEmail,
        code_hash: codeHash,
        purpose,
        expires_at: expiresAt.toISOString(),
        attempt_count: 0,
        consumed_at: null,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('[OTP] Supabase exception (using fallback store):', err?.message || err);
    memoryOTPStore.push({
      id: `mem_${Date.now()}_${Math.random()}`,
      email: normalizedEmail,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt.toISOString(),
      attempt_count: 0,
      consumed_at: null,
      created_at: new Date().toISOString(),
    });
  }

  return {
    code: rawCode,
    expiresAt,
  };
}

/**
 * Verify a submitted 6-digit OTP code.
 */
export async function verifyOTP(
  email: string,
  code: string,
  purpose: OTPPurpose
): Promise<VerifyOTPResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const submittedHash = hashCode(code.trim());

  let record: any = null;

  // 1. Try fetching latest unconsumed OTP from Supabase
  try {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      record = data;
    }
  } catch {
    /* fallback to memory */
  }

  // 2. Check in-memory store if DB didn't return a record
  if (!record) {
    record = memoryOTPStore
      .filter((r) => r.email === normalizedEmail && r.purpose === purpose && !r.consumed_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  if (!record) {
    return { success: false, message: 'Invalid or expired verification code' };
  }

  // Check attempt limit (max 5 attempts)
  if (record.attempt_count >= 5) {
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new code.',
    };
  }

  // Check 5-minute expiry
  if (new Date(record.expires_at) < new Date()) {
    return { success: false, message: 'Verification code has expired' };
  }

  // Compare hash
  if (record.code_hash !== submittedHash) {
    record.attempt_count += 1;
    
    // Update DB attempt count if record is in DB
    try {
      if (!record.id.startsWith('mem_')) {
        await supabase
          .from('otp_codes')
          .update({ attempt_count: record.attempt_count })
          .eq('id', record.id);
      }
    } catch {
      /* ignore */
    }

    const remaining = 5 - record.attempt_count;
    return {
      success: false,
      message: `Incorrect code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked out.'}`,
    };
  }

  // Code matches — mark as consumed
  record.consumed_at = new Date().toISOString();
  try {
    if (!record.id.startsWith('mem_')) {
      await supabase
        .from('otp_codes')
        .update({ consumed_at: record.consumed_at })
        .eq('id', record.id);
    }
  } catch {
    /* ignore */
  }

  return { success: true };
}
