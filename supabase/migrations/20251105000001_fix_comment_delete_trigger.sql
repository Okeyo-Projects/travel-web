-- Migration to fix comment delete functionality
-- Updates the trigger to handle soft deletes (UPDATE operations)

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trg_update_reply_count ON comments;

-- Update the function to handle soft deletes
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE comments 
    SET replies_count = replies_count + 1 
    WHERE id = NEW.parent_id AND deleted_at IS NULL;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE comments 
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE id = OLD.parent_id AND deleted_at IS NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete: if deleted_at changed from NULL to a timestamp
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND OLD.parent_id IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = GREATEST(0, replies_count - 1)
      WHERE id = OLD.parent_id AND deleted_at IS NULL;
    -- Handle restore: if deleted_at changed from timestamp to NULL
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND OLD.parent_id IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = replies_count + 1
      WHERE id = OLD.parent_id AND deleted_at IS NULL;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to fire on UPDATE as well
CREATE TRIGGER trg_update_reply_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- Fix any existing incorrect reply counts (optional, but recommended)
-- This corrects counts for comments that might have been soft-deleted before this fix
DO $$
DECLARE
  parent_comment RECORD;
  actual_count INTEGER;
BEGIN
  FOR parent_comment IN 
    SELECT id, replies_count 
    FROM comments 
    WHERE deleted_at IS NULL AND parent_id IS NULL
  LOOP
    SELECT COUNT(*) INTO actual_count
    FROM comments
    WHERE parent_id = parent_comment.id 
      AND deleted_at IS NULL;
    
    IF actual_count != parent_comment.replies_count THEN
      UPDATE comments
      SET replies_count = actual_count
      WHERE id = parent_comment.id;
    END IF;
  END LOOP;
END $$;












