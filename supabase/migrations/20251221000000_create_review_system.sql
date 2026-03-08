-- Review Request System
-- This migration adds support for post-booking review requests

-- Review Requests table
-- Tracks review requests sent to guests after booking completion
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Booking reference
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
  host_id UUID NOT NULL REFERENCES hosts(id),

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),

  -- Timeline
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Reminder tracking
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INT DEFAULT 0,

  -- Expiration (review requests expire after 30 days)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add videos support to reviews table
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS videos TEXT[],
  ADD COLUMN IF NOT EXISTS media_processing_status TEXT DEFAULT 'completed' CHECK (media_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add review_request_id to reviews for tracking
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS review_request_id UUID REFERENCES review_requests(id);

-- Indexes for performance
CREATE INDEX idx_review_requests_guest_id ON review_requests(guest_id) WHERE status = 'pending';
CREATE INDEX idx_review_requests_booking_id ON review_requests(booking_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_expires_at ON review_requests(expires_at) WHERE status IN ('pending', 'accepted');

-- Function to create review request after booking completion
CREATE OR REPLACE FUNCTION create_review_request_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create review request when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if review request doesn't already exist
    INSERT INTO review_requests (
      booking_id,
      experience_id,
      guest_id,
      host_id,
      status,
      requested_at
    )
    VALUES (
      NEW.id,
      NEW.experience_id,
      NEW.guest_id,
      NEW.host_id,
      'pending',
      NOW()
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create review requests
CREATE TRIGGER trg_create_review_request
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION create_review_request_for_booking();

-- Function to mark booking as completed after end date
CREATE OR REPLACE FUNCTION complete_past_bookings()
RETURNS TABLE (
  booking_id UUID,
  guest_id UUID,
  experience_id UUID
) AS $$
BEGIN
  RETURN QUERY
  UPDATE bookings
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE
    status = 'confirmed'
    AND to_date < CURRENT_DATE
    AND completed_at IS NULL
  RETURNING id, guest_id, experience_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending review requests for a user
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
    e.media AS experience_media,
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
  JOIN profiles p ON p.id = h.user_id
  WHERE
    rr.guest_id = p_user_id
    AND rr.status = 'pending'
    AND rr.expires_at > NOW()
  ORDER BY rr.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update review_request status when review is created
CREATE OR REPLACE FUNCTION mark_review_request_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark associated review request as completed
  IF NEW.review_request_id IS NOT NULL THEN
    UPDATE review_requests
    SET
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.review_request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to mark review request as completed when review is created
CREATE TRIGGER trg_mark_review_request_completed
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.review_request_id IS NOT NULL)
  EXECUTE FUNCTION mark_review_request_completed();

-- Triggers for updated_at
CREATE TRIGGER trg_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT SELECT ON review_requests TO authenticated;
GRANT INSERT, UPDATE ON review_requests TO authenticated;

-- RLS Policies for review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own review requests
CREATE POLICY review_requests_select_own
  ON review_requests
  FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());

-- Users can update their own review requests (accept/decline)
CREATE POLICY review_requests_update_own
  ON review_requests
  FOR UPDATE
  TO authenticated
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

-- Service role can insert review requests (via edge functions)
CREATE POLICY review_requests_insert_service
  ON review_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE review_requests IS 'Tracks review requests sent to guests after completing their bookings';
COMMENT ON COLUMN review_requests.status IS 'pending: waiting for guest action, accepted: guest agreed to review, declined: guest declined, completed: review submitted';
COMMENT ON COLUMN review_requests.expires_at IS 'Review requests expire after 30 days to keep the system clean';
COMMENT ON FUNCTION create_review_request_for_booking() IS 'Automatically creates a review request when a booking is marked as completed';
COMMENT ON FUNCTION complete_past_bookings() IS 'Marks bookings as completed when their end date has passed (called by cron job)';
COMMENT ON FUNCTION get_pending_review_requests(UUID) IS 'Retrieves all pending review requests for a user with related data';
