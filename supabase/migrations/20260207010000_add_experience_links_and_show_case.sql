-- Add showcase flag to experiences
ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS show_case BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN experiences.show_case IS 'Whether to feature this experience on the home screen';

-- Link experiences to other experiences (directional)
CREATE TABLE IF NOT EXISTS experience_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  target_experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT experience_links_no_self CHECK (source_experience_id <> target_experience_id),
  CONSTRAINT experience_links_unique UNIQUE (source_experience_id, target_experience_id)
);

CREATE INDEX IF NOT EXISTS experience_links_source_idx
  ON experience_links (source_experience_id);

CREATE INDEX IF NOT EXISTS experience_links_target_idx
  ON experience_links (target_experience_id);

COMMENT ON TABLE experience_links IS 'Directional links between experiences (e.g., lodge -> activity)';
