-- Add translated descriptions and SEO content columns to experiences
ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS short_description_en  TEXT,
  ADD COLUMN IF NOT EXISTS short_description_fr  TEXT,
  ADD COLUMN IF NOT EXISTS short_description_ar  TEXT,
  ADD COLUMN IF NOT EXISTS long_description_en   TEXT,
  ADD COLUMN IF NOT EXISTS long_description_fr   TEXT,
  ADD COLUMN IF NOT EXISTS long_description_ar   TEXT,
  ADD COLUMN IF NOT EXISTS seo_title_en          TEXT,
  ADD COLUMN IF NOT EXISTS seo_title_fr          TEXT,
  ADD COLUMN IF NOT EXISTS seo_title_ar          TEXT,
  ADD COLUMN IF NOT EXISTS seo_description_en    TEXT,
  ADD COLUMN IF NOT EXISTS seo_description_fr    TEXT,
  ADD COLUMN IF NOT EXISTS seo_description_ar    TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords_en       TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords_fr       TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords_ar       TEXT,
  ADD COLUMN IF NOT EXISTS is_translated         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_seo_generated      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_language     TEXT CHECK (original_language IN ('en', 'fr', 'ar'));

CREATE INDEX IF NOT EXISTS idx_experiences_is_translated    ON experiences (is_translated);
CREATE INDEX IF NOT EXISTS idx_experiences_is_seo_generated ON experiences (is_seo_generated);
CREATE INDEX IF NOT EXISTS idx_experiences_original_language ON experiences (original_language);
