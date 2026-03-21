-- Migration to fix RLS policies for comments
-- Makes trigger function SECURITY DEFINER so it bypasses RLS when updating reply counts

-- Drop existing policies
DROP POLICY IF EXISTS comments_own_update ON comments;
DROP POLICY IF EXISTS comments_own_delete ON comments;

-- Recreate UPDATE policy that allows users to update their own comments only
CREATE POLICY comments_own_update ON comments
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Keep DELETE policy for hard deletes (though we use soft delete)
CREATE POLICY comments_own_delete ON comments
  FOR DELETE
  USING (auth.uid() = author_id);

-- Update the trigger function with SECURITY DEFINER so it can bypass RLS
-- This allows the trigger to update parent comment reply counts
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER
SECURITY DEFINER -- This makes the function bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_update_reply_count ON comments;
CREATE TRIGGER trg_update_reply_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- Also update the likes count function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

