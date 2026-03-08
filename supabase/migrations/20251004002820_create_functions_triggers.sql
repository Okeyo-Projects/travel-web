-- Business Logic Functions and Triggers

-- ===========================================
-- VIDEO VALIDATION
-- ===========================================

-- Ensure video is present before publishing experience
CREATE OR REPLACE FUNCTION ensure_video()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NEW.video_id IS NULL THEN
      RAISE EXCEPTION 'Experience % requires an immersive video (10-180 sec) before publishing', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experience_publish_video
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published')
  EXECUTE FUNCTION ensure_video();

-- ===========================================
-- LODGING COMPLETENESS
-- ===========================================

-- Lodging requires at least one room type before publish
CREATE OR REPLACE FUNCTION ensure_lodging_ready()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'lodging' AND NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM lodging_room_types r 
      WHERE r.experience_id = NEW.id AND r.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Lodging experience % requires at least one room type', NEW.id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM experiences_lodging el
      WHERE el.experience_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Lodging experience % requires lodging details', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experience_publish_lodging
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  WHEN (NEW.type = 'lodging' AND NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published')
  EXECUTE FUNCTION ensure_lodging_ready();

-- ===========================================
-- TRIP COMPLETENESS
-- ===========================================

-- Trip requires itinerary and departures before publish
CREATE OR REPLACE FUNCTION ensure_trip_ready()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'trip' AND NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT EXISTS (SELECT 1 FROM trip_itinerary WHERE experience_id = NEW.id) THEN
      RAISE EXCEPTION 'Trip experience % requires itinerary', NEW.id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM trip_departures WHERE experience_id = NEW.id) THEN
      RAISE EXCEPTION 'Trip experience % requires at least one departure', NEW.id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM experiences_trip WHERE experience_id = NEW.id) THEN
      RAISE EXCEPTION 'Trip experience % requires trip details', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experience_publish_trip
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  WHEN (NEW.type = 'trip' AND NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published')
  EXECUTE FUNCTION ensure_trip_ready();

-- ===========================================
-- BOOKING INVENTORY MANAGEMENT
-- ===========================================

-- Decrement trip departure seats on booking confirmation
CREATE OR REPLACE FUNCTION decrement_trip_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending_payment' THEN
    UPDATE trip_departures
    SET seats_available = seats_available - (NEW.adults + NEW.children)
    WHERE id = NEW.departure_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Departure not found for booking %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_booking_confirmed
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND NEW.departure_id IS NOT NULL)
  EXECUTE FUNCTION decrement_trip_seats();

-- Restore seats on cancellation
CREATE OR REPLACE FUNCTION restore_trip_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' AND OLD.departure_id IS NOT NULL THEN
    UPDATE trip_departures
    SET seats_available = seats_available + (OLD.adults + OLD.children)
    WHERE id = OLD.departure_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION restore_trip_seats();

-- ===========================================
-- PAYMENT STATUS UPDATES
-- ===========================================

-- Update booking status on payment success
CREATE OR REPLACE FUNCTION update_booking_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN
    UPDATE bookings 
    SET status = 'confirmed'
    WHERE id = NEW.booking_id AND status = 'pending_payment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_success
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'succeeded')
  EXECUTE FUNCTION update_booking_on_payment();

-- ===========================================
-- REVIEW VALIDATION
-- ===========================================

-- Can only review completed bookings
CREATE OR REPLACE FUNCTION validate_review_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = NEW.booking_id 
      AND status = 'completed'
      AND guest_id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'Can only review completed bookings';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_review
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_review_booking();

-- ===========================================
-- RATING AGGREGATION
-- ===========================================

-- Update experience avg_rating and review count
CREATE OR REPLACE FUNCTION update_experience_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE experiences SET
    avg_rating = (
      SELECT AVG(rating_overall)::NUMERIC(3,2)
      FROM reviews
      WHERE experience_id = NEW.experience_id AND deleted_at IS NULL
    ),
    reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE experience_id = NEW.experience_id AND deleted_at IS NULL
    )
  WHERE id = NEW.experience_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_experience_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_rating();

-- ===========================================
-- CHAT THREAD UPDATES
-- ===========================================

-- Update thread last_message info
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats_threads SET
    last_message_at = NEW.created_at,
    last_message_preview = COALESCE(LEFT(NEW.text, 100), '[Media]')
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_thread
  AFTER INSERT ON chats_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- ===========================================
-- FULL-TEXT SEARCH
-- ===========================================

-- Update search vector on experience changes
CREATE OR REPLACE FUNCTION experiences_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('french', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(NEW.long_description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.city, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experiences_search_update
  BEFORE INSERT OR UPDATE OF title, short_description, long_description, city
  ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION experiences_search_trigger();

-- ===========================================
-- SUBTYPE VALIDATION
-- ===========================================

-- Ensure lodging subtype only for lodging experiences
CREATE OR REPLACE FUNCTION validate_lodging_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM experiences 
    WHERE id = NEW.experience_id AND type = 'lodging'
  ) THEN
    RAISE EXCEPTION 'experiences_lodging can only reference experiences with type=lodging';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_lodging_type
  BEFORE INSERT OR UPDATE ON experiences_lodging
  FOR EACH ROW
  EXECUTE FUNCTION validate_lodging_type();

-- Ensure trip subtype only for trip experiences
CREATE OR REPLACE FUNCTION validate_trip_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM experiences 
    WHERE id = NEW.experience_id AND type = 'trip'
  ) THEN
    RAISE EXCEPTION 'experiences_trip can only reference experiences with type=trip';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_trip_type
  BEFORE INSERT OR UPDATE ON experiences_trip
  FOR EACH ROW
  EXECUTE FUNCTION validate_trip_type();

