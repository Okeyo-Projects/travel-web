-- Make location column nullable in experiences table
-- This allows experiences to be created without coordinates initially

ALTER TABLE experiences
ALTER COLUMN location DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN experiences.location IS 'Geographic location (nullable - will use city/region for display if not set)';
