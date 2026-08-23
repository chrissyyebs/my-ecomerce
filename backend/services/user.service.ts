// ============================================================
// User Persistence & Authentication Service
// Database persistence with bcryptjs password hashing & zero-crash memory store fallback
// ============================================================

import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

export interface DBUserRecord {
  id: string;
  clerk_user_id?: string | null;
  full_name: string;
  email: string;
  password_hash: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// In-memory fallback store if Supabase DB table is uninitialized or unreachable
const memoryUserStore: DBUserRecord[] = [];

/**
 * Find user by email (case-insensitive) in Supabase or fallback memory store.
 */
export async function findUserByEmail(email: string): Promise<DBUserRecord | null> {
  const normalized = email.toLowerCase().trim();

  // 1. Try fetching from Supabase DB
  try {
    const { data, error } = await supabase
      .from('client_users')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();

    if (!error && data) {
      return data as DBUserRecord;
    }
  } catch {
    /* fallback to memory */
  }

  // 2. Check in-memory store
  const found = memoryUserStore.find((u) => u.email.toLowerCase() === normalized);
  return found || null;
}

/**
 * Create new user record in Supabase DB with bcrypt hashed password.
 */
export async function createUser(params: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}): Promise<DBUserRecord> {
  const normalizedEmail = params.email.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(params.password, 10);

  const newUser: DBUserRecord = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    clerk_user_id: null,
    full_name: params.fullName.trim(),
    email: normalizedEmail,
    password_hash: hashedPassword,
    phone: params.phone.trim(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store in memory fallback first
  memoryUserStore.push(newUser);

  // Attempt Supabase DB insertion
  try {
    const { data, error } = await supabase
      .from('client_users')
      .insert({
        full_name: newUser.full_name,
        email: newUser.email,
        password_hash: newUser.password_hash,
        phone: newUser.phone,
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as DBUserRecord;
    }
  } catch (err: any) {
    console.warn('[UserService] Supabase insert warning (using fallback memory store):', err?.message || err);
  }

  return newUser;
}

/**
 * Verify user password using bcryptjs.
 */
export async function verifyUserCredentials(
  user: DBUserRecord,
  plainPassword: string
): Promise<boolean> {
  if (!user || !user.password_hash) return false;
  return await bcrypt.compare(plainPassword, user.password_hash);
}

/**
 * Update user password after successful OTP reset.
 */
export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const newHash = await bcrypt.hash(newPassword, 10);

  // Update memory store
  const memUser = memoryUserStore.find((u) => u.email.toLowerCase() === normalized);
  if (memUser) {
    memUser.password_hash = newHash;
    memUser.updated_at = new Date().toISOString();
  }

  // Update Supabase DB
  try {
    const { error } = await supabase
      .from('client_users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('email', normalized);

    if (!error) return true;
  } catch {
    /* fallback to memory status */
  }

  return !!memUser;
}

/**
 * Permanently delete a user account from the database and memory store.
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();

  // Remove from memory store
  const memIdx = memoryUserStore.findIndex((u) => u.email.toLowerCase() === normalized);
  if (memIdx !== -1) {
    memoryUserStore.splice(memIdx, 1);
  }

  // Remove from Supabase DB
  try {
    const { error } = await supabase
      .from('client_users')
      .delete()
      .eq('email', normalized);

    if (!error) return true;
    console.warn('[UserService] Supabase delete warning:', error.message);
  } catch (err: any) {
    console.warn('[UserService] Supabase delete exception:', err?.message || err);
  }

  return memIdx !== -1;
}
