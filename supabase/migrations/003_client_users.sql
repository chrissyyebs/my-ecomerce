-- ============================================================
-- Migration 003: Client Users Table
-- Table to store registered client profiles, phone & password hash in Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS client_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone         TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_clerk ON client_users (clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- Trigger to keep updated_at current
CREATE TRIGGER set_client_users_updated_at
  BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Public read / service role access
CREATE POLICY "Users can read own profile"
  ON client_users FOR SELECT
  USING (email = auth.jwt() ->> 'email' OR clerk_user_id = auth.uid()::TEXT);
