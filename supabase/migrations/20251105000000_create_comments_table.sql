-- Comments table for feed/reel comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Author
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Target (experience for now, can be extended)
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Content
  text TEXT NOT NULL CHECK (LENGTH(text) >= 1 AND LENGTH(text) <= 1000),
  
  -- Nested replies (parent comment)
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Metrics
  likes_count INT DEFAULT 0 NOT NULL,
  replies_count INT DEFAULT 0 NOT NULL,
  
  -- Flags
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_comments_experience ON comments(experience_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to update reply count when a reply is added/deleted
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

CREATE TRIGGER trg_update_reply_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- RLS Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted comments
CREATE POLICY comments_public_read ON comments
  FOR SELECT
  USING (deleted_at IS NULL);

-- Authenticated users can create comments
CREATE POLICY comments_auth_insert ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = author_id AND deleted_at IS NULL);

-- Users can update their own comments
CREATE POLICY comments_own_update ON comments
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own comments (soft delete)
CREATE POLICY comments_own_delete ON comments
  FOR DELETE
  USING (auth.uid() = author_id);

-- Comment Likes junction table
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);

-- Trigger to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_comment_likes
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- RLS for comment likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_likes_public_read ON comment_likes
  FOR SELECT
  USING (true);

CREATE POLICY comment_likes_auth_insert ON comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY comment_likes_own_delete ON comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);


