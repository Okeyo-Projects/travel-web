-- Fix get_pending_review_requests function to properly fetch experience media
-- The experiences table doesn't have a 'media' column - media is in experience_media table

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
    p.name AS host_name,
    p.avatar_url AS host_avatar,
    b.from_date AS booking_from_date,
    b.to_date AS booking_to_date,
    rr.requested_at,
    rr.expires_at,
    EXTRACT(DAY FROM (rr.expires_at - NOW()))::INT AS days_until_expiry
  FROM review_requests rr
  JOIN bookings b ON b.id = rr.booking_id
  JOIN experiences e ON e.id = rr.experience_id
  JOIN hosts h ON h.id = rr.host_id
  JOIN profiles p ON p.id = h.owner_id
  WHERE
    rr.guest_id = p_user_id
    AND rr.status = 'pending'
    AND rr.expires_at > NOW()
  ORDER BY rr.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
