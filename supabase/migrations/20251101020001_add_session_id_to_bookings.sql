-- Add session_id column to bookings table for activity bookings
-- This allows us to track which activity session a booking is for

ALTER TABLE bookings
ADD COLUMN session_id UUID REFERENCES activity_sessions(id);

-- Create index for session_id lookups
CREATE INDEX idx_bookings_session_id ON bookings(session_id);

-- Add comment for documentation
COMMENT ON COLUMN bookings.session_id IS 'For activities: reference to the specific session being booked';

-- Update the trigger for activity bookings to handle session_id
-- Recreate the booking cancelled trigger to include activity sessions
DROP TRIGGER IF EXISTS trg_booking_cancelled ON bookings;
DROP FUNCTION IF EXISTS on_booking_cancelled();

CREATE OR REPLACE FUNCTION on_booking_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_experience_type experience_type;
  v_party_size INT;
BEGIN
  -- Only process if status changed to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN

    -- Get experience type
    SELECT type INTO v_experience_type
    FROM experiences
    WHERE id = NEW.experience_id;

    -- Calculate party size
    v_party_size := NEW.adults + NEW.children;

    -- Release inventory based on type
    IF v_experience_type = 'lodging' AND NEW.rooms IS NOT NULL THEN
      PERFORM release_lodging_rooms(NEW.from_date, NEW.to_date, NEW.rooms);

    ELSIF v_experience_type = 'trip' AND NEW.departure_id IS NOT NULL THEN
      PERFORM release_trip_seats(NEW.departure_id, v_party_size);

    ELSIF v_experience_type = 'activity' AND NEW.session_id IS NOT NULL THEN
      PERFORM release_activity_capacity(NEW.session_id, v_party_size);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION on_booking_cancelled();

-- Update the booking declined trigger as well
DROP TRIGGER IF EXISTS trg_booking_declined ON bookings;
DROP FUNCTION IF EXISTS on_booking_declined();

CREATE OR REPLACE FUNCTION on_booking_declined()
RETURNS TRIGGER AS $$
DECLARE
  v_experience_type experience_type;
  v_party_size INT;
BEGIN
  -- Only process if status changed to 'declined'
  IF NEW.status = 'declined' AND (OLD.status IS NULL OR OLD.status != 'declined') THEN

    -- Get experience type
    SELECT type INTO v_experience_type
    FROM experiences
    WHERE id = NEW.experience_id;

    -- Calculate party size
    v_party_size := NEW.adults + NEW.children;

    -- Release inventory based on type
    IF v_experience_type = 'lodging' AND NEW.rooms IS NOT NULL THEN
      PERFORM release_lodging_rooms(NEW.from_date, NEW.to_date, NEW.rooms);

    ELSIF v_experience_type = 'trip' AND NEW.departure_id IS NOT NULL THEN
      PERFORM release_trip_seats(NEW.departure_id, v_party_size);

    ELSIF v_experience_type = 'activity' AND NEW.session_id IS NOT NULL THEN
      PERFORM release_activity_capacity(NEW.session_id, v_party_size);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_declined
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'declined')
  EXECUTE FUNCTION on_booking_declined();
