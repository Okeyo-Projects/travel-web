-- User Experience History Tracking
-- Tracks when users view experience detail pages for displaying recent experiences

-- Create the history table
CREATE TABLE user_experience_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Timestamp
  visited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate entries for same user+experience
  CONSTRAINT unique_user_experience UNIQUE (user_id, experience_id)
);

-- Indexes for performance
-- Primary index for fetching recent experiences for a user
CREATE INDEX idx_user_experience_history_user_visited 
  ON user_experience_history(user_id, visited_at DESC);

-- Index for join performance with experiences
CREATE INDEX idx_user_experience_history_experience 
  ON user_experience_history(experience_id);

-- Row Level Security Policies
ALTER TABLE user_experience_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY user_experience_history_own_read 
  ON user_experience_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY user_experience_history_own_insert 
  ON user_experience_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own history (for upserts)
CREATE POLICY user_experience_history_own_update 
  ON user_experience_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Database function to upsert experience visit
-- This function records or updates when a user visits an experience
CREATE OR REPLACE FUNCTION upsert_experience_visit(p_experience_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert the visit record
  INSERT INTO user_experience_history (user_id, experience_id, visited_at)
  VALUES (auth.uid(), p_experience_id, NOW())
  ON CONFLICT (user_id, experience_id)
  DO UPDATE SET visited_at = NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_experience_visit(UUID) TO authenticated;

-- Comment on table and function for documentation
COMMENT ON TABLE user_experience_history IS 'Tracks user visits to experience detail pages for displaying recently viewed experiences';
COMMENT ON FUNCTION upsert_experience_visit IS 'Records or updates a user''s visit to an experience detail page';
