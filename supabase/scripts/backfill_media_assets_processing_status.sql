-- Backfill media assets linked to experiences so RLS allows them to be read
-- Sets processing_status to 'completed' for any non-completed assets

BEGIN;

UPDATE media_assets ma
SET processing_status = 'completed',
    updated_at = NOW()
WHERE ma.processing_status IS DISTINCT FROM 'completed'
  AND (
    ma.bucket = 'experiences'
    OR EXISTS (SELECT 1 FROM experience_media em WHERE em.media_id = ma.id)
    OR EXISTS (SELECT 1 FROM experiences e WHERE e.video_id = ma.id)
  );

COMMIT;
