-- =====================================================
-- RPC Functions for Reel Likes Count
-- =====================================================
-- Functions to atomically increment/decrement likes_count
-- on reels table to avoid race conditions
-- =====================================================

-- Increment likes_count on a reel
CREATE OR REPLACE FUNCTION increment_reel_likes_count(p_reel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE reels
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = p_reel_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement likes_count on a reel (with floor at 0)
CREATE OR REPLACE FUNCTION decrement_reel_likes_count(p_reel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE reels
  SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
  WHERE id = p_reel_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION increment_reel_likes_count IS
  'Atomically increment likes_count on a reel by 1';

COMMENT ON FUNCTION decrement_reel_likes_count IS
  'Atomically decrement likes_count on a reel by 1 (minimum 0)';

