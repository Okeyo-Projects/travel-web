-- Relax reels visibility filter so authenticated users can see all non-deleted reels

-- Replace public-only read policy with authenticated read (any visibility) while keeping soft-delete guard
DROP POLICY IF EXISTS reels_public_read ON reels;

CREATE POLICY reels_authenticated_read ON reels
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Ensure media assets linked to reels are readable for authenticated users regardless of reel visibility
CREATE POLICY media_assets_reel_access_authenticated ON media_assets
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM reels r
        WHERE r.video_id = media_assets.id
          AND r.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM reels r
        WHERE r.thumbnail_path = media_assets.path
          AND r.deleted_at IS NULL
      )
    )
  );
