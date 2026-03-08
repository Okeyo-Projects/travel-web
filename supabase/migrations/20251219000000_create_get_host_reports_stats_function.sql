-- 20251219000000_create_get_host_reports_stats_function.sql

CREATE OR REPLACE FUNCTION get_host_reports_and_stats(p_host_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  reports_json JSONB;
  stats_json JSONB;
BEGIN
  WITH host_reports AS (
    SELECT
      rr.id,
      rr.reporter_id,
      rr.reel_id,
      rr.reason,
      rr.description,
      rr.status,
      rr.reviewed_at,
      rr.reviewed_by,
      rr.resolution_notes,
      rr.created_at,
      rr.updated_at,
      r.experience_id
    FROM reel_reports rr
    JOIN reels r ON rr.reel_id = r.id
    JOIN experiences e ON r.experience_id = e.id
    WHERE e.host_id = p_host_id
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', hr.id,
        'reporter_id', hr.reporter_id,
        'reel_id', hr.reel_id,
        'reason', hr.reason,
        'description', hr.description,
        'status', hr.status,
        'reviewed_at', hr.reviewed_at,
        'reviewed_by', hr.reviewed_by,
        'resolution_notes', hr.resolution_notes,
        'created_at', hr.created_at,
        'updated_at', hr.updated_at,
        'reel', jsonb_build_object(
          'id', r.id,
          'experience_id', r.experience_id,
          'title', r.caption,
          'thumbnail_url', r.thumbnail_path
        ),
        'reporter', jsonb_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url
        ),
        'experience', jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'thumbnail_url', e.hero_video_id -- Assuming hero_video_id can be used as a thumbnail
        )
      )
    )
  INTO reports_json
  FROM host_reports hr
  JOIN reels r ON hr.reel_id = r.id
  JOIN profiles p ON hr.reporter_id = p.id
  JOIN experiences e ON hr.experience_id = e.id;

  SELECT
    jsonb_build_object(
      'total', COUNT(*),
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'actioned', COUNT(*) FILTER (WHERE status = 'actioned'),
      'dismissed', COUNT(*) FILTER (WHERE status = 'dismissed'),
      'byReason', jsonb_build_object(
        'violence', COUNT(*) FILTER (WHERE reason = 'violence'),
        'inappropriate', COUNT(*) FILTER (WHERE reason = 'inappropriate'),
        'spam', COUNT(*) FILTER (WHERE reason = 'spam'),
        'harassment', COUNT(*) FILTER (WHERE reason = 'harassment'),
        'misinformation', COUNT(*) FILTER (WHERE reason = 'misinformation'),
        'other', COUNT(*) FILTER (WHERE reason = 'other')
      )
    )
  INTO stats_json
  FROM host_reports;

  RETURN jsonb_build_object(
    'reports', COALESCE(reports_json, '[]'::jsonb),
    'stats', COALESCE(stats_json, '{}'::jsonb)
  );
END;
$$;
