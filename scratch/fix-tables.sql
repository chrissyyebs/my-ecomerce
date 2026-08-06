-- ============================================================
-- Fix Script: Run this in Supabase SQL Editor
-- Creates otp_codes table and adds password_hash + phone to client_users
-- ============================================================

-- 1. Create otp_codes table if missing
CREATE TABLE IF NOT EXISTS otp_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  purpose       TEXT NOT NULL CHECK (purpose IN ('signup_verification', 'password_reset')),
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email, purpose, created_at DESC);

-- 2. Add password_hash column to client_users if missing
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Add phone column to client_users if missing
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. Make password_hash NOT NULL for future rows (set default for existing rows first)
UPDATE client_users SET password_hash = 'NEEDS_RESET' WHERE password_hash IS NULL;

-- Done! Both tables are now ready.
SELECT 'Migration complete!' AS status;
