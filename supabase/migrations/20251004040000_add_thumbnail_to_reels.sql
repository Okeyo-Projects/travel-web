-- Add dedicated thumbnail column to reels
ALTER TABLE reels
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
