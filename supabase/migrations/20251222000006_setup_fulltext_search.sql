-- Setup full-text search for experiences
-- This migration creates triggers to automatically populate and maintain the search_vector column

-- Create function to update search_vector with weighted content including host info
CREATE OR REPLACE FUNCTION update_experience_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  host_name TEXT;
BEGIN
  -- Get host name for this experience
  SELECT name INTO host_name
  FROM hosts
  WHERE id = NEW.host_id;

  -- Build search vector with weighted content:
  -- 'A' weight = highest importance (title, city, host name)
  -- 'B' weight = medium importance (short_description, region, tags)
  -- 'C' weight = lower importance (long_description)
  NEW.search_vector := 
    setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.city, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(host_name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(NEW.region, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('french', coalesce(NEW.long_description, '')), 'C');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trg_experiences_search_vector
  BEFORE INSERT OR UPDATE OF title, short_description, long_description, city, region, tags, host_id
  ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_search_vector();

-- Also update search_vector when host name changes
CREATE OR REPLACE FUNCTION update_experiences_on_host_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all experiences for this host
  UPDATE experiences
  SET updated_at = NOW()
  WHERE host_id = NEW.id AND deleted_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hosts_name_changed
  AFTER UPDATE OF name ON hosts
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION update_experiences_on_host_change();

-- Backfill existing experiences with search_vector data
-- This runs once to populate search_vector for all existing experiences
DO $$
DECLARE
  exp_record RECORD;
  host_name TEXT;
BEGIN
  FOR exp_record IN 
    SELECT id, title, short_description, long_description, city, region, tags, host_id
    FROM experiences
    WHERE deleted_at IS NULL
  LOOP
    -- Get host name
    SELECT name INTO host_name
    FROM hosts
    WHERE id = exp_record.host_id;

    -- Update search_vector
    UPDATE experiences
    SET search_vector = 
      setweight(to_tsvector('french', coalesce(exp_record.title, '')), 'A') ||
      setweight(to_tsvector('french', coalesce(exp_record.city, '')), 'A') ||
      setweight(to_tsvector('french', coalesce(host_name, '')), 'A') ||
      setweight(to_tsvector('french', coalesce(exp_record.short_description, '')), 'B') ||
      setweight(to_tsvector('french', coalesce(exp_record.region, '')), 'B') ||
      setweight(to_tsvector('french', coalesce(array_to_string(exp_record.tags, ' '), '')), 'B') ||
      setweight(to_tsvector('french', coalesce(exp_record.long_description, '')), 'C')
    WHERE id = exp_record.id;
  END LOOP;
  
  RAISE NOTICE 'Backfilled search_vector for all existing experiences';
END $$;

-- Create function to search experiences with ranking and highlighting
-- This can be called from the application for more complex search scenarios
CREATE OR REPLACE FUNCTION search_experiences(
  search_query TEXT,
  experience_type experience_type DEFAULT NULL,
  min_price INT DEFAULT NULL,
  max_price INT DEFAULT NULL,
  featured_only BOOLEAN DEFAULT FALSE,
  sort_by TEXT DEFAULT 'newest',
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  short_description TEXT,
  city TEXT,
  region TEXT,
  type experience_type,
  thumbnail_url TEXT,
  avg_rating NUMERIC,
  reviews_count INT,
  rank REAL,
  highlighted_title TEXT,
  highlighted_description TEXT
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery
  ts_query := websearch_to_tsquery('french', search_query);
  
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.short_description,
    e.city,
    e.region,
    e.type,
    e.thumbnail_url,
    e.avg_rating,
    e.reviews_count,
    ts_rank(e.search_vector, ts_query) as rank,
    ts_headline('french', e.title, ts_query, 'MaxWords=50, MinWords=10') as highlighted_title,
    ts_headline('french', e.short_description, ts_query, 'MaxWords=100, MinWords=20') as highlighted_description
  FROM experiences e
  WHERE 
    e.status = 'published'
    AND e.deleted_at IS NULL
    AND e.search_vector @@ ts_query
    AND (experience_type IS NULL OR e.type = experience_type)
    AND (featured_only = FALSE OR (e.avg_rating >= 4.5 AND e.reviews_count >= 5))
  ORDER BY
    CASE 
      WHEN sort_by = 'relevance' THEN ts_rank(e.search_vector, ts_query)
      WHEN sort_by = 'rating' THEN e.avg_rating
      WHEN sort_by = 'popular' THEN e.bookings_count
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN e.created_at END DESC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;
