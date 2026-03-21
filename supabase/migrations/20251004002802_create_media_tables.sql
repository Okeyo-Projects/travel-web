-- Media and Reels tables

-- Media assets (centralized storage)
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Type
  kind media_kind NOT NULL,
  
  -- Storage
  path TEXT NOT NULL,
  bucket TEXT DEFAULT 'media',
  
  -- Metadata
  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  width INT,
  height INT,
  duration_seconds INT, -- For videos (10-180 sec for immersive videos)
  
  -- Processing Status
  processing_status processing_status DEFAULT 'pending',
  transcode_job_id TEXT,
  
  -- HLS (for videos)
  hls_playlist_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Add FK constraint to experiences.video_id
ALTER TABLE experiences 
  ADD CONSTRAINT fk_experiences_video 
  FOREIGN KEY (video_id) 
  REFERENCES media_assets(id);

-- Experience media (photos only, video is in experiences.video_id)
CREATE TABLE experience_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  
  role media_role NOT NULL,
  order_index INT DEFAULT 0,
  caption TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(experience_id, media_id, role)
);

-- Reels (short-form vertical videos)
CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  caption TEXT,
  video_id UUID NOT NULL REFERENCES media_assets(id),
  
  -- Link to experience (optional)
  experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
  
  -- Visibility
  visibility reel_visibility DEFAULT 'public',
  
  -- Stats (denormalized)
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  
  -- Flags
  is_featured BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  
  -- SEO
  hashtags TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Triggers
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reels_updated_at
  BEFORE UPDATE ON reels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

