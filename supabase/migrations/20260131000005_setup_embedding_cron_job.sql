-- =====================================================
-- SETUP CRON JOB FOR AUTOMATIC EMBEDDING GENERATION
-- This creates a scheduled job that runs daily to generate embeddings
-- =====================================================

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to call the edge function
-- This makes it easier to update the URL and parameters
CREATE OR REPLACE FUNCTION trigger_embedding_generation()
RETURNS void AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
  response TEXT;
BEGIN
  -- Get Supabase URL from current settings
  -- You'll need to update this with your actual Supabase URL
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-embeddings';
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Make HTTP POST request to edge function
  SELECT content INTO response
  FROM http((
    'POST',
    function_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || service_role_key)
    ],
    'application/json',
    jsonb_build_object(
      'batchSize', 10,
      'maxExperiences', 100
    )::text
  )::http_request);
  
  -- Log the response
  RAISE NOTICE 'Embedding generation response: %', response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the job to run daily at 2 AM UTC
-- This processes up to 100 experiences per day that don't have embeddings
SELECT cron.schedule(
  'generate-embeddings-daily',       -- Job name
  '0 2 * * *',                        -- Cron expression: Daily at 2 AM UTC
  'SELECT trigger_embedding_generation();'
);

-- Alternative schedules (uncomment the one you want to use):

-- Every hour (for high-frequency updates)
-- SELECT cron.schedule(
--   'generate-embeddings-hourly',
--   '0 * * * *',
--   'SELECT trigger_embedding_generation();'
-- );

-- Every 6 hours
-- SELECT cron.schedule(
--   'generate-embeddings-6h',
--   '0 */6 * * *',
--   'SELECT trigger_embedding_generation();'
-- );

-- Twice daily (2 AM and 2 PM)
-- SELECT cron.schedule(
--   'generate-embeddings-twice-daily',
--   '0 2,14 * * *',
--   'SELECT trigger_embedding_generation();'
-- );

-- Weekly on Sundays at 2 AM
-- SELECT cron.schedule(
--   'generate-embeddings-weekly',
--   '0 2 * * 0',
--   'SELECT trigger_embedding_generation();'
-- );

-- Create a view to monitor cron job execution
CREATE OR REPLACE VIEW embedding_generation_jobs AS
SELECT 
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  jrd.runid,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON j.jobid = jrd.jobid
WHERE j.jobname LIKE 'generate-embeddings%'
ORDER BY jrd.start_time DESC
LIMIT 50;

-- Grant access to the view
GRANT SELECT ON embedding_generation_jobs TO authenticated;

COMMENT ON VIEW embedding_generation_jobs IS 'Monitor embedding generation cron job execution';

-- Create helper function to manually trigger embedding generation
CREATE OR REPLACE FUNCTION manually_trigger_embeddings()
RETURNS jsonb AS $$
BEGIN
  PERFORM trigger_embedding_generation();
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Embedding generation triggered',
    'timestamp', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION manually_trigger_embeddings IS 'Manually trigger embedding generation (for testing or on-demand use)';

-- Create function to get embedding generation stats
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_experiences', COUNT(*),
    'with_embeddings', COUNT(*) FILTER (WHERE embedding IS NOT NULL),
    'without_embeddings', COUNT(*) FILTER (WHERE embedding IS NULL),
    'percentage_complete', 
      ROUND(
        (COUNT(*) FILTER (WHERE embedding IS NOT NULL)::numeric / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
      ),
    'last_updated', MAX(updated_at) FILTER (WHERE embedding IS NOT NULL),
    'published_experiences', COUNT(*) FILTER (WHERE status = 'published')
  )
  INTO stats
  FROM experiences
  WHERE deleted_at IS NULL;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_embedding_stats IS 'Get statistics about embedding generation progress';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_embedding_generation() TO service_role;
GRANT EXECUTE ON FUNCTION manually_trigger_embeddings() TO service_role;
GRANT EXECUTE ON FUNCTION get_embedding_stats() TO authenticated;

-- Create a table to log embedding generation runs (optional but useful)
CREATE TABLE IF NOT EXISTS embedding_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  experiences_processed INT DEFAULT 0,
  experiences_successful INT DEFAULT 0,
  experiences_failed INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_embedding_logs_started ON embedding_generation_logs(started_at DESC);

COMMENT ON TABLE embedding_generation_logs IS 'Logs of embedding generation runs for monitoring and debugging';

-- Example queries for monitoring:

-- View recent cron job runs
-- SELECT * FROM embedding_generation_jobs LIMIT 10;

-- Get current embedding stats
-- SELECT * FROM get_embedding_stats();

-- View scheduled jobs
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'generate-embeddings%';

-- Manually trigger (for testing)
-- SELECT manually_trigger_embeddings();

-- Unschedule job if needed
-- SELECT cron.unschedule('generate-embeddings-daily');
