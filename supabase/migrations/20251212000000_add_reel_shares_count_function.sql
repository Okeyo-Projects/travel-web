-- =====================================================
-- RPC Functions for Reel Shares Count
-- =====================================================
-- Function to atomically increment shares_count
-- on reels table to avoid race conditions
-- =====================================================

-- Increment shares_count on a reel
CREATE OR REPLACE FUNCTION increment_reel_shares_count(p_reel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE reels
  SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = p_reel_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION increment_reel_shares_count IS
  'Atomically increment shares_count on a reel by 1';
