-- Add 'reel' to like_target_type
ALTER TYPE like_target_type ADD VALUE IF NOT EXISTS 'reel';

-- Create reports table
CREATE TABLE IF NOT EXISTS reel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reporter
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Target
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  
  -- Report details
  reason TEXT NOT NULL, -- 'violence', 'inappropriate', 'spam', 'harassment', 'misinformation', 'other'
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate reports
  UNIQUE(reporter_id, reel_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reel_reports_reel_id ON reel_reports(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_reports_reporter_id ON reel_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reel_reports_status ON reel_reports(status);
CREATE INDEX IF NOT EXISTS idx_reel_reports_created_at ON reel_reports(created_at DESC);

-- RLS Policies
ALTER TABLE reel_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" ON reel_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON reel_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Update trigger
CREATE TRIGGER trg_reel_reports_updated_at
  BEFORE UPDATE ON reel_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

