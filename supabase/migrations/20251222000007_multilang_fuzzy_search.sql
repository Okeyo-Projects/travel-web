-- Multi-language full-text search and fuzzy matching setup
-- This migration adds language-specific search vectors and trigram indexes for typo tolerance

-- Add language-specific search vector columns
ALTER TABLE experiences 
  ADD COLUMN IF NOT EXISTS search_vector_fr tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_ar tsvector;

-- Create GIN indexes for each language-specific search vector
CREATE INDEX IF NOT EXISTS idx_experiences_search_fr ON experiences USING GIN(search_vector_fr);
CREATE INDEX IF NOT EXISTS idx_experiences_search_en ON experiences USING GIN(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_experiences_search_ar ON experiences USING GIN(search_vector_ar);

-- Drop old single-language trigger
DROP TRIGGER IF EXISTS trg_experiences_search_vector ON experiences;
DROP FUNCTION IF EXISTS update_experience_search_vector();

-- Create updated function to populate all language-specific search vectors
CREATE OR REPLACE FUNCTION update_experience_search_vectors()
RETURNS TRIGGER AS $$
DECLARE
  host_name TEXT;
BEGIN
  -- Get host name for this experience
  SELECT name INTO host_name
  FROM hosts
  WHERE id = NEW.host_id;

  -- French search vector
  NEW.search_vector_fr := 
    setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(host_name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('french', coalesce(NEW.long_description, '')), 'C');
  
  -- English search vector
  NEW.search_vector_en := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(host_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.long_description, '')), 'C');
  
  -- Arabic search vector
  NEW.search_vector_ar := 
    setweight(to_tsvector('arabic', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(host_name, '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('arabic', coalesce(NEW.long_description, '')), 'C');
  
  -- Keep the generic search_vector for backward compatibility (uses French)
  NEW.search_vector := NEW.search_vector_fr;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for multi-language search vectors
CREATE TRIGGER trg_experiences_search_vectors
  BEFORE INSERT OR UPDATE OF title, short_description, long_description, city, region, tags, host_id
  ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_search_vectors();

-- Backfill all language-specific search vectors for existing experiences
DO $$
DECLARE
  exp_record RECORD;
  host_name TEXT;
BEGIN
  RAISE NOTICE 'Starting backfill of multi-language search vectors...';
  
  FOR exp_record IN 
    SELECT id, title, short_description, long_description, city, region, tags, host_id
    FROM experiences
    WHERE deleted_at IS NULL
  LOOP
    -- Get host name
    SELECT name INTO host_name
    FROM hosts
    WHERE id = exp_record.host_id;

    -- Update all language-specific search vectors
    UPDATE experiences
    SET 
      search_vector_fr = 
        setweight(to_tsvector('french', coalesce(exp_record.title, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(exp_record.city, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(host_name, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(exp_record.short_description, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(exp_record.region, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(array_to_string(exp_record.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('french', coalesce(exp_record.long_description, '')), 'C'),
      
      search_vector_en = 
        setweight(to_tsvector('english', coalesce(exp_record.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(exp_record.city, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(host_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(exp_record.short_description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(exp_record.region, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(exp_record.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', coalesce(exp_record.long_description, '')), 'C'),
      
      search_vector_ar = 
        setweight(to_tsvector('arabic', coalesce(exp_record.title, '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(exp_record.city, '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(host_name, '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(exp_record.short_description, '')), 'B') ||
        setweight(to_tsvector('arabic', coalesce(exp_record.region, '')), 'B') ||
        setweight(to_tsvector('arabic', coalesce(array_to_string(exp_record.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('arabic', coalesce(exp_record.long_description, '')), 'C')
    WHERE id = exp_record.id;
  END LOOP;
  
  RAISE NOTICE 'Completed backfill of multi-language search vectors';
END $$;

-- Enable pg_trgm extension for fuzzy/typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes for fuzzy matching on key text fields
-- These enable typo-tolerant search (e.g., "marakeesh" finds "Marrakech")
CREATE INDEX IF NOT EXISTS idx_experiences_title_trgm ON experiences USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_experiences_city_trgm ON experiences USING GIN(city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_experiences_description_trgm ON experiences USING GIN(short_description gin_trgm_ops);

-- Also add trigram index on hosts.name for fuzzy host search
CREATE INDEX IF NOT EXISTS idx_hosts_name_trgm ON hosts USING GIN(name gin_trgm_ops);

-- Set default similarity threshold (0.3 = 30% similarity)
-- Can be adjusted per-query using SET
ALTER DATABASE postgres SET pg_trgm.similarity_threshold = 0.3;
