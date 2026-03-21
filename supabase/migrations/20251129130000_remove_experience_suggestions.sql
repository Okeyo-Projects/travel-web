-- Remove experience title suggestions from search autocomplete
-- Experiences are already shown in the main results list below suggestions
-- Keep only city and host suggestions to help users navigate

-- Drop and recreate the materialized view without experience suggestions
DROP MATERIALIZED VIEW IF EXISTS search_suggestions CASCADE;

CREATE MATERIALIZED VIEW search_suggestions AS
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

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions(suggestion);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_trgm ON search_suggestions USING GIN(suggestion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(suggestion_type);

-- Add unique index to enable concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_suggestions_unique 
  ON search_suggestions(suggestion, suggestion_type, experience_count);

-- Initial refresh
REFRESH MATERIALIZED VIEW search_suggestions;
