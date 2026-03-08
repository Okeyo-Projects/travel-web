-- =====================================================
-- AUTOMATIC EMBEDDING GENERATION ON EXPERIENCE PUBLISH
-- Triggers embedding generation when an experience is published
-- =====================================================

-- Function to queue embedding generation for a new/published experience
CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if experience was just published
  IF (NEW.status = 'published' AND 
      (OLD.status IS NULL OR OLD.status != 'published')) THEN
    
    -- Set embedding to NULL to mark for generation
    NEW.embedding = NULL;
    
    -- Log for monitoring
    INSERT INTO embedding_generation_logs (
      started_at,
      status,
      metadata
    ) VALUES (
      NOW(),
      'pending',
      jsonb_build_object(
        'experience_id', NEW.id,
        'trigger', 'publish',
        'title', NEW.title
      )
    );
    
    RAISE NOTICE 'Experience % marked for embedding generation', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on experiences table
DROP TRIGGER IF EXISTS trg_queue_embedding_on_publish ON experiences;
CREATE TRIGGER trg_queue_embedding_on_publish
  BEFORE INSERT OR UPDATE OF status ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_generation();

-- Create a function to check pending embeddings count
CREATE OR REPLACE FUNCTION count_pending_embeddings()
RETURNS TABLE (
  pending_count BIGINT,
  oldest_pending TIMESTAMPTZ,
  newest_pending TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as pending_count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
  FROM experiences
  WHERE status = 'published' 
    AND embedding IS NULL 
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a view to monitor pending experiences
CREATE OR REPLACE VIEW pending_embeddings AS
SELECT 
  id,
  title,
  type,
  city,
  created_at,
  published_at,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, created_at))) / 3600 as hours_pending
FROM experiences
WHERE status = 'published' 
  AND embedding IS NULL 
  AND deleted_at IS NULL
ORDER BY created_at ASC;

GRANT SELECT ON pending_embeddings TO authenticated;

COMMENT ON VIEW pending_embeddings IS 'Monitor experiences waiting for embedding generation';

-- Example queries:

-- Check how many experiences are pending
-- SELECT * FROM count_pending_embeddings();

-- View experiences waiting for embeddings
-- SELECT * FROM pending_embeddings;

-- Find experiences pending for more than 1 hour
-- SELECT * FROM pending_embeddings WHERE hours_pending > 1;
