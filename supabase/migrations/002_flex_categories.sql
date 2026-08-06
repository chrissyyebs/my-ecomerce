-- ============================================================
-- Migration 002: Flexible Categories
-- 1. Change parent_group from enum to TEXT (allows any category type)
-- 2. Add image_url column to categories
-- ============================================================

-- 1. Change parent_group to TEXT to allow any category type
ALTER TABLE categories ALTER COLUMN parent_group TYPE TEXT USING parent_group::TEXT;

-- 2. Add image_url column for category images
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Drop the old enum type (now unused)
DROP TYPE IF EXISTS parent_group_enum;
