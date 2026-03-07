-- Search autocomplete / suggestions system
-- Creates materialized view for fast autocomplete queries

-- Create materialized view for popular search suggestions
CREATE MATERIALIZED VIEW IF NOT EXISTS search_suggestions AS
-- City suggestions (most common)
SELECT 
  city as suggestion,
  'city' as suggestion_type,
  COUNT(*) as experience_count,
  MAX(avg_rating) as max_rating
FROM experiences
WHERE status = 'published' AND deleted_at IS NULL AND city IS NOT NULL
GROUP BY city

UNION ALL

-- Popular titles (for exact match suggestions)
SELECT 
  title as suggestion,
  'experience' as suggestion_type,
  1 as experience_count,
  avg_rating as max_rating
FROM experiences
WHERE status = 'published' AND deleted_at IS NULL 
  AND (avg_rating >= 4.5 OR bookings_count >= 10)

UNION ALL

-- Host names (for host search)
SELECT 
  h.name as suggestion,
  'host' as suggestion_type,
  COUNT(e.id) as experience_count,
  MAX(e.avg_rating) as max_rating
FROM hosts h
INNER JOIN experiences e ON e.host_id = h.id
WHERE e.status = 'published' AND e.deleted_at IS NULL AND h.deleted_at IS NULL
GROUP BY h.name

ORDER BY experience_count DESC, max_rating DESC NULLS LAST
LIMIT 1000;

-- Create indexes for fast autocomplete queries
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions(suggestion);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_trgm ON search_suggestions USING GIN(suggestion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(suggestion_type);

-- Add unique index to enable concurrent refreshes in the future
-- Using row_number to ensure uniqueness even with duplicate suggestions
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_suggestions_unique 
  ON search_suggestions(suggestion, suggestion_type, experience_count);

-- Create function to refresh suggestions (call periodically)
CREATE OR REPLACE FUNCTION refresh_search_suggestions()
RETURNS void AS $$
BEGIN
  -- Use CONCURRENTLY now that we have a unique index
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_suggestions;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to non-concurrent refresh if concurrent fails
    REFRESH MATERIALIZED VIEW search_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Create function for getting autocomplete suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_query TEXT,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  suggestion_type TEXT,
  experience_count INT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.suggestion,
    s.suggestion_type,
    s.experience_count::INT,
    similarity(s.suggestion, search_query) as relevance
  FROM search_suggestions s
  WHERE 
    -- Exact prefix match OR fuzzy match
    s.suggestion ILIKE search_query || '%'
    OR s.suggestion % search_query
  ORDER BY 
    -- Prioritize exact prefix matches
    CASE WHEN s.suggestion ILIKE search_query || '%' THEN 1 ELSE 2 END,
    -- Then by relevance
    similarity(s.suggestion, search_query) DESC,
    -- Then by popularity
    s.experience_count DESC,
    s.max_rating DESC NULLS LAST
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Initial refresh (non-concurrent for first time)
REFRESH MATERIALIZED VIEW search_suggestions;

-- Note: Schedule periodic refresh in your application or via pg_cron if installed
-- Example with pg_cron (if available):
-- SELECT cron.schedule('refresh-search-suggestions', '0 2 * * *', 'SELECT refresh_search_suggestions()');
