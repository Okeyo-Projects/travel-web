-- =====================================================
-- FIX PROMOTIONS SYSTEM - REMOVE AUTH.USERS DEPENDENCIES
-- =====================================================
-- This migration fixes permission issues by removing foreign keys
-- and RLS policies that reference auth.users table
-- =====================================================

-- =====================================================
-- 1. DROP PROBLEMATIC FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop FK constraints to auth.users (causes permission errors)
ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_created_by_admin_id_fkey;
ALTER TABLE promotion_usages DROP CONSTRAINT IF EXISTS promotion_usages_user_id_fkey;
ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referrer_user_id_fkey;
ALTER TABLE user_referrals DROP CONSTRAINT IF EXISTS user_referrals_referee_user_id_fkey;
ALTER TABLE generated_promo_codes DROP CONSTRAINT IF EXISTS generated_promo_codes_user_id_fkey;
ALTER TABLE user_promotion_eligibility DROP CONSTRAINT IF EXISTS user_promotion_eligibility_user_id_fkey;

-- =====================================================
-- 2. RENAME COLUMNS (IF NEEDED)
-- =====================================================

-- Rename admin_id column to be more generic
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' 
    AND column_name = 'created_by_admin_id'
  ) THEN
    ALTER TABLE promotions RENAME COLUMN created_by_admin_id TO created_by_user_id;
  END IF;
END $$;

-- =====================================================
-- 3. DROP AND RECREATE RLS POLICIES
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all promotions" ON promotions;
DROP POLICY IF EXISTS "Hosts can manage their own promotions" ON promotions;

-- Recreate simplified host policy
-- hosts.owner_id → profiles.id → auth.uid()
CREATE POLICY "Hosts can manage their own promotions"
  ON promotions FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    host_id IN (
      SELECT h.id 
      FROM hosts h
      INNER JOIN profiles p ON h.owner_id = p.id
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    host_id IN (
      SELECT h.id 
      FROM hosts h
      INNER JOIN profiles p ON h.owner_id = p.id
      WHERE p.id = auth.uid()
    )
  );

-- =====================================================
-- 4. VERIFY EXISTING POLICIES ARE CORRECT
-- =====================================================

-- Ensure other policies exist (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'promotions' 
    AND policyname = 'Anyone can view active promotions'
  ) THEN
    CREATE POLICY "Anyone can view active promotions"
      ON promotions FOR SELECT
      USING (status = 'active' AND (valid_until IS NULL OR valid_until > NOW()));
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN promotions.created_by_user_id IS 'User ID who created this promotion (no FK to avoid auth.users permission issues)';
COMMENT ON COLUMN promotion_usages.user_id IS 'User who used this promotion (no FK to avoid auth.users permission issues)';
COMMENT ON COLUMN user_referrals.referrer_user_id IS 'User who referred (no FK to avoid auth.users permission issues)';
COMMENT ON COLUMN user_referrals.referee_user_id IS 'User who was referred (no FK to avoid auth.users permission issues)';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List all constraints on promotions table
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'promotions'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE '%auth_users%';
  
  IF constraint_count > 0 THEN
    RAISE NOTICE 'WARNING: Still have % FK constraints to auth.users', constraint_count;
  ELSE
    RAISE NOTICE 'SUCCESS: No FK constraints to auth.users found';
  END IF;
END $$;

-- List all policies on promotions table
DO $$
BEGIN
  RAISE NOTICE '=== Current RLS Policies on promotions ===';
END $$;

SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'promotions'
ORDER BY policyname;

