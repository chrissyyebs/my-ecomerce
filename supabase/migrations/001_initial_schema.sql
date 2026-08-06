-- ============================================================
-- The Tote Life — Initial Schema
-- Supabase (Postgres) migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE parent_group_enum AS ENUM ('bags', 'furniture');

CREATE TYPE order_status_enum AS ENUM (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE message_sender_enum AS ENUM ('customer', 'admin');

CREATE TYPE admin_role_enum AS ENUM ('admin', 'super_admin');

CREATE TYPE audit_action_enum AS ENUM (
  'create',
  'update',
  'delete',
  'status_change',
  'login',
  'telegram_action'
);

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Categories
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  parent_group parent_group_enum NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_group ON categories (parent_group) WHERE is_active = TRUE;

-- 2. Products
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  size            TEXT,
  colors          TEXT[],
  materials       TEXT[],
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products (category_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_active ON products (is_active, created_at DESC);
CREATE INDEX idx_products_stock_low ON products (stock_quantity) WHERE is_active = TRUE AND stock_quantity <= 10;

-- 3. Product Images
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bucket_path TEXT NOT NULL,
  public_url  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images (product_id, sort_order);

-- 4. Orders
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         TEXT NOT NULL,  -- Clerk user ID
  status              order_status_enum NOT NULL DEFAULT 'pending',
  total_amount        NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_method     TEXT NOT NULL DEFAULT 'door',
  delivery_fee        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_address    JSONB,
  customer_email      TEXT NOT NULL,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT,
  payment_reference   TEXT UNIQUE,    -- UNIQUE constraint for idempotency
  placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders (customer_id, placed_at DESC);
CREATE INDEX idx_orders_status ON orders (status, placed_at DESC);
CREATE UNIQUE INDEX idx_orders_payment_ref ON orders (payment_reference) WHERE payment_reference IS NOT NULL;

-- 5. Order Items
CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity                INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_at_purchase  NUMERIC(10, 2) NOT NULL CHECK (unit_price_at_purchase >= 0),
  selected_size           TEXT,
  selected_color          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- 6. Admins
CREATE TABLE admins (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id     TEXT NOT NULL UNIQUE,
  role              admin_role_enum NOT NULL DEFAULT 'admin',
  telegram_chat_id  TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admins_clerk_user ON admins (clerk_user_id);

-- 7. Support Conversations
CREATE TABLE support_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     TEXT NOT NULL,  -- Clerk user ID
  customer_name   TEXT NOT NULL,
  customer_email  TEXT,
  telegram_thread_id TEXT,        -- If using Telegram topic threads
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open', 'closed'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_conversations_customer ON support_conversations (customer_id, status);

-- 8. Support Messages
CREATE TABLE support_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender            message_sender_enum NOT NULL,
  sender_id         TEXT NOT NULL,  -- Clerk user ID or admin ID
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_conversation ON support_messages (conversation_id, created_at ASC);

-- 9. Audit Log
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    TEXT NOT NULL,      -- Clerk user ID of the admin
  action      audit_action_enum NOT NULL,
  entity_type TEXT NOT NULL,      -- 'product', 'order', 'category', 'admin', etc.
  entity_id   TEXT,               -- UUID of the affected entity (as text for flexibility)
  details     JSONB,              -- Additional context
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON audit_log (admin_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);

-- 10. Processed Webhook Events (Idempotency table for external webhooks)
CREATE TABLE processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. OTP Codes
CREATE TABLE otp_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  purpose       TEXT NOT NULL CHECK (purpose IN ('signup_verification', 'password_reset')),
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_email ON otp_codes (email, purpose, created_at DESC);

-- ============================================================
-- STORED PROCEDURES & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, p_qty INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_id AND stock_quantity >= p_qty AND is_active = TRUE;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_support_conversations_updated_at
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Public read policies (active items only)
CREATE POLICY "Public can read active categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Public can read product images for active products"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
        AND products.is_active = TRUE
    )
  );

-- Authenticated user policies (orders — own data only)
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid()::TEXT);

CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()::TEXT
    )
  );

-- Support: users can read own conversations and messages
-- Note: All INSERTs to support_conversations and support_messages are performed
-- via the Express API / Telegram Webhook using the Service Role Key.
-- The frontend only reads & subscribes to Realtime.
CREATE POLICY "Users can read own support conversations"
  ON support_conversations FOR SELECT
  USING (customer_id = auth.uid()::TEXT);

CREATE POLICY "Users can read own support messages"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
        AND support_conversations.customer_id = auth.uid()::TEXT
    )
  );

-- ============================================================
-- SUPABASE REALTIME
-- ============================================================

-- Enable realtime on support_messages so the frontend can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
