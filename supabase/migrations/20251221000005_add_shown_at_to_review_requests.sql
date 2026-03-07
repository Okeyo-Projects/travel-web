-- Add shown_at column to track when review request modal was shown to user
-- This allows us to track shown requests in the database instead of AsyncStorage

ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS shown_at TIMESTAMPTZ;

-- Add index for querying unshown requests
CREATE INDEX IF NOT EXISTS idx_review_requests_shown_at
  ON review_requests(shown_at)
  WHERE status = 'pending' AND shown_at IS NULL;

-- Update the function to only return requests that haven't been shown yet
-- Or requests that were shown more than 7 days ago (for gentle reminders)
CREATE OR REPLACE FUNCTION get_pending_review_requests(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  experience_id UUID,
  experience_title TEXT,
  experience_media TEXT[],
  host_id UUID,
  host_name TEXT,
  host_avatar TEXT,
  booking_from_date DATE,
  booking_to_date DATE,
  requested_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.id,
    rr.booking_id,
    rr.experience_id,
    e.title AS experience_title,
    COALESCE(
      (
        SELECT array_agg(ma.path ORDER BY em.order_index)
        FROM experience_media em
        JOIN media_assets ma ON ma.id = em.media_id
        WHERE em.experience_id = e.id
          AND em.role = 'photo'
        LIMIT 5
      ),
      ARRAY[]::TEXT[]
    ) AS experience_media,
    rr.host_id,
    h.name AS host_name,
    h.avatar_url AS host_avatar,
    b.from_date AS booking_from_date,
    b.to_date AS booking_to_date,
    rr.requested_at,
    rr.expires_at,
    EXTRACT(DAY FROM (rr.expires_at - NOW()))::INT AS days_until_expiry
  FROM review_requests rr
  JOIN bookings b ON b.id = rr.booking_id
  JOIN experiences e ON e.id = rr.experience_id
  JOIN hosts h ON h.id = rr.host_id
  WHERE
    rr.guest_id = p_user_id
    AND rr.status = 'pending'
    AND rr.expires_at > NOW()
    AND (
      rr.shown_at IS NULL  -- Never shown before
      OR rr.shown_at < NOW() - INTERVAL '7 days'  -- Shown more than 7 days ago (gentle reminder)
    )
  ORDER BY rr.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a review request as shown
CREATE OR REPLACE FUNCTION mark_review_request_as_shown(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE review_requests
  SET
    shown_at = NOW(),
    updated_at = NOW()
  WHERE
    id = p_request_id
    AND guest_id = auth.uid()  -- Security: only the guest can mark their own request as shown
    AND shown_at IS NULL;  -- Only update if not already shown
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN review_requests.shown_at IS 'Timestamp when the review request modal was first shown to the user';
COMMENT ON FUNCTION mark_review_request_as_shown(UUID) IS 'Marks a review request as shown to the user. Only updates if not already shown.';
