-- Migration to disable RLS on comments table
-- WARNING: This removes row-level security. Use only if you handle security at application level.

-- Disable RLS on comments table
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (they're no longer needed)
DROP POLICY IF EXISTS comments_public_read ON comments;
DROP POLICY IF EXISTS comments_auth_insert ON comments;
DROP POLICY IF EXISTS comments_own_update ON comments;
DROP POLICY IF EXISTS comments_own_delete ON comments;

-- Make sure the trigger function can still update reply counts
-- Set it to SECURITY DEFINER so it runs with elevated privileges
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER
SECURITY DEFINER
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

-- Update comment likes trigger function too
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

-- Disable RLS on comment_likes table as well
ALTER TABLE comment_likes DISABLE ROW LEVEL SECURITY;

-- Drop comment_likes policies
DROP POLICY IF EXISTS comment_likes_public_read ON comment_likes;
DROP POLICY IF EXISTS comment_likes_auth_insert ON comment_likes;
DROP POLICY IF EXISTS comment_likes_own_delete ON comment_likes;












