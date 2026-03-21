-- =====================================================
-- Add comments_count to experiences table
-- =====================================================
-- Add comments_count field to track number of comments
-- per experience (counting all comments including replies)
-- =====================================================

-- Add comments_count column to experiences table
ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0 NOT NULL;

-- =====================================================
-- Function to update experience comments_count
-- =====================================================
-- Updates comments_count on experiences table when comments
-- are inserted, deleted, or soft-deleted
-- Counts all comments including replies
-- =====================================================

CREATE OR REPLACE FUNCTION update_experience_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Count all comments (including replies)
  IF TG_OP = 'INSERT' THEN
    -- Increment count when a new comment is added (top-level or reply)
    UPDATE experiences
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.experience_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count when a comment is deleted (top-level or reply)
    UPDATE experiences
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
    WHERE id = OLD.experience_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete: if deleted_at changed from NULL to a timestamp
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE experiences
      SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
      WHERE id = OLD.experience_id;
    -- Handle restore: if deleted_at changed from timestamp to NULL
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE experiences
      SET comments_count = COALESCE(comments_count, 0) + 1
      WHERE id = OLD.experience_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trg_update_experience_comments_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_comments_count();

-- =====================================================
-- Function to update reel comments_count
-- =====================================================
-- Updates comments_count on reels table when comments
-- are added/deleted for the linked experience
-- Counts all comments including replies
-- =====================================================

CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Count all comments (including replies)
  IF TG_OP = 'INSERT' THEN
    -- Increment count on all reels linked to this experience
    UPDATE reels
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE experience_id = NEW.experience_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count on all reels linked to this experience
    UPDATE reels
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
    WHERE experience_id = OLD.experience_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete: if deleted_at changed from NULL to a timestamp
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE reels
      SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
      WHERE experience_id = OLD.experience_id;
    -- Handle restore: if deleted_at changed from timestamp to NULL
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE reels
      SET comments_count = COALESCE(comments_count, 0) + 1
      WHERE experience_id = OLD.experience_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for reels
CREATE TRIGGER trg_update_reel_comments_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_comments_count();

-- =====================================================
-- Initialize existing counts
-- =====================================================
-- Update comments_count for all existing experiences
-- =====================================================

UPDATE experiences e
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.experience_id = e.id
    AND c.deleted_at IS NULL
);

-- Update comments_count for all existing reels
UPDATE reels r
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.experience_id = r.experience_id
    AND c.deleted_at IS NULL
)
WHERE r.experience_id IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN experiences.comments_count IS
  'Denormalized count of all comments including replies (excluding deleted comments)';

COMMENT ON FUNCTION update_experience_comments_count IS
  'Automatically updates comments_count on experiences when comments are added/deleted';

COMMENT ON FUNCTION update_reel_comments_count IS
  'Automatically updates comments_count on reels when comments are added/deleted for linked experiences';

