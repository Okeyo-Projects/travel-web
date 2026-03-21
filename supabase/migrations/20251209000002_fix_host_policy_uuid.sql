-- =====================================================
-- FIX HOST POLICY UUID ISSUE
-- =====================================================
-- This migration fixes the "invalid input syntax for type uuid" error
-- by properly handling the auth.uid() -> profiles -> hosts relationship
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Hosts can manage their own promotions" ON promotions;

-- Recreate with proper UUID handling and explicit JOIN
-- Relationship: hosts.owner_id → profiles.id → auth.uid()
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

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'promotions' 
    AND policyname = 'Hosts can manage their own promotions'
  ) THEN
    RAISE NOTICE 'SUCCESS: Host policy created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: Host policy was not created';
  END IF;
END $$;

-- Show all policies on promotions table for verification
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  permissive as "Permissive"
FROM pg_policies
WHERE tablename = 'promotions'
ORDER BY policyname;

-- Test query to verify the policy works (will return empty if user not a host)
-- This is just for verification, won't fail if empty
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count
  FROM (
    SELECT h.id 
    FROM hosts h
    INNER JOIN profiles p ON h.owner_id = p.id
    WHERE p.id = auth.uid()
  ) AS host_check;
  
  RAISE NOTICE 'Found % host record(s) for current user', test_count;
END $$;

-- Add helpful comments
COMMENT ON POLICY "Hosts can manage their own promotions" ON promotions IS 
  'Allows hosts to manage (view, create, update, delete) their own promotions. Uses explicit JOIN through profiles table to avoid UUID casting issues.';

