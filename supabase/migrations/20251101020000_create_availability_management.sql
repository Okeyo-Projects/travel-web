-- =====================================================
-- AVAILABILITY MANAGEMENT SYSTEM
-- =====================================================
-- This migration implements comprehensive availability checking
-- and inventory management for lodging, trips, and activities
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate date range array
CREATE OR REPLACE FUNCTION generate_date_range(
  start_date DATE,
  end_date DATE
) RETURNS DATE[] AS $$
DECLARE
  dates DATE[] := ARRAY[]::DATE[];
  curr_date DATE := start_date;
BEGIN
  WHILE curr_date < end_date LOOP
    dates := array_append(dates, curr_date);
    curr_date := curr_date + INTERVAL '1 day';
  END LOOP;
  RETURN dates;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- AVAILABILITY CHECKING FUNCTIONS
-- =====================================================

-- Check lodging availability for specific room types and date range
CREATE OR REPLACE FUNCTION check_lodging_availability(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB -- [{"room_type_id": "uuid", "quantity": 2}]
) RETURNS TABLE (
  available BOOLEAN,
  message TEXT,
  unavailable_dates DATE[],
  room_conflicts JSONB
) AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
  v_available_count INT;
  v_all_available BOOLEAN := TRUE;
  v_unavailable_dates DATE[] := ARRAY[]::DATE[];
  v_conflicts JSONB := '[]'::JSONB;
BEGIN
  -- Validate inputs
  IF p_from_date >= p_to_date THEN
    RETURN QUERY SELECT FALSE, 'Invalid date range: to_date must be after from_date'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  IF p_rooms IS NULL OR jsonb_array_length(p_rooms) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No rooms specified'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  -- Check each room type
  FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    -- Check availability for each date in range
    FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
    LOOP
      -- Get available rooms for this date
      SELECT COALESCE(rooms_available, 0) INTO v_available_count
      FROM lodging_availability
      WHERE room_type_id = v_room_type_id
        AND date = v_date;

      -- If no availability record exists, check room type total
      IF NOT FOUND THEN
        SELECT total_rooms INTO v_available_count
        FROM lodging_room_types
        WHERE id = v_room_type_id;
      END IF;

      -- Check if enough rooms available
      IF v_available_count < v_quantity THEN
        v_all_available := FALSE;
        v_unavailable_dates := array_append(v_unavailable_dates, v_date);

        v_conflicts := v_conflicts || jsonb_build_object(
          'room_type_id', v_room_type_id,
          'date', v_date,
          'requested', v_quantity,
          'available', v_available_count
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Return result
  IF v_all_available THEN
    RETURN QUERY SELECT TRUE, 'All rooms available'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
  ELSE
    RETURN QUERY SELECT FALSE,
                        format('Insufficient availability for %s dates', array_length(v_unavailable_dates, 1))::TEXT,
                        v_unavailable_dates,
                        v_conflicts;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Check trip departure availability
CREATE OR REPLACE FUNCTION check_trip_availability(
  p_departure_id UUID,
  p_party_size INT
) RETURNS TABLE (
  available BOOLEAN,
  message TEXT,
  seats_available INT,
  seats_total INT
) AS $$
DECLARE
  v_seats_available INT;
  v_seats_total INT;
  v_status TEXT;
BEGIN
  -- Get departure info
  SELECT
    td.seats_available,
    td.seats_total,
    td.status
  INTO v_seats_available, v_seats_total, v_status
  FROM trip_departures td
  WHERE td.id = p_departure_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Departure not found'::TEXT, 0, 0;
    RETURN;
  END IF;

  -- Check departure status
  IF v_status != 'scheduled' THEN
    RETURN QUERY SELECT FALSE,
                        format('Departure is %s and not available for booking', v_status)::TEXT,
                        v_seats_available,
                        v_seats_total;
    RETURN;
  END IF;

  -- Check if enough seats
  IF v_seats_available >= p_party_size THEN
    RETURN QUERY SELECT TRUE,
                        format('%s of %s seats available', v_seats_available, v_seats_total)::TEXT,
                        v_seats_available,
                        v_seats_total;
  ELSE
    RETURN QUERY SELECT FALSE,
                        format('Only %s seats available, need %s', v_seats_available, p_party_size)::TEXT,
                        v_seats_available,
                        v_seats_total;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Check activity session availability
CREATE OR REPLACE FUNCTION check_activity_availability(
  p_session_id UUID,
  p_party_size INT
) RETURNS TABLE (
  available BOOLEAN,
  message TEXT,
  capacity_available INT,
  capacity_total INT
) AS $$
DECLARE
  v_capacity_available INT;
  v_capacity_total INT;
  v_status TEXT;
BEGIN
  -- Get session info
  SELECT
    acs.capacity_available,
    acs.capacity_total,
    acs.status
  INTO v_capacity_available, v_capacity_total, v_status
  FROM activity_sessions acs
  WHERE acs.id = p_session_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Session not found'::TEXT, 0, 0;
    RETURN;
  END IF;

  -- Check session status
  IF v_status != 'scheduled' THEN
    RETURN QUERY SELECT FALSE,
                        format('Session is %s and not available for booking', v_status)::TEXT,
                        v_capacity_available,
                        v_capacity_total;
    RETURN;
  END IF;

  -- Check capacity
  IF v_capacity_available >= p_party_size THEN
    RETURN QUERY SELECT TRUE,
                        format('%s of %s spots available', v_capacity_available, v_capacity_total)::TEXT,
                        v_capacity_available,
                        v_capacity_total;
  ELSE
    RETURN QUERY SELECT FALSE,
                        format('Only %s spots available, need %s', v_capacity_available, p_party_size)::TEXT,
                        v_capacity_available,
                        v_capacity_total;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- =====================================================

-- Initialize lodging availability records for a date range
CREATE OR REPLACE FUNCTION initialize_lodging_availability(
  p_experience_id UUID,
  p_room_type_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS INT AS $$
DECLARE
  v_total_rooms INT;
  v_date DATE;
  v_inserted_count INT := 0;
BEGIN
  -- Get total rooms for this room type
  SELECT total_rooms INTO v_total_rooms
  FROM lodging_room_types
  WHERE id = p_room_type_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type not found: %', p_room_type_id;
  END IF;

  -- Insert availability records for each date
  FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date + INTERVAL '1 day'))
  LOOP
    INSERT INTO lodging_availability (
      experience_id,
      room_type_id,
      date,
      rooms_total,
      rooms_available
    ) VALUES (
      p_experience_id,
      p_room_type_id,
      v_date,
      v_total_rooms,
      v_total_rooms
    )
    ON CONFLICT (room_type_id, date) DO NOTHING;

    IF FOUND THEN
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Reserve lodging rooms (decrement availability)
CREATE OR REPLACE FUNCTION reserve_lodging_rooms(
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
BEGIN
  -- Reserve each room type for each date
  FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
    LOOP
      UPDATE lodging_availability
      SET rooms_available = rooms_available - v_quantity,
          updated_at = NOW()
      WHERE room_type_id = v_room_type_id
        AND date = v_date
        AND rooms_available >= v_quantity; -- Ensure we have enough

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient rooms available for room_type_id % on date %',
                        v_room_type_id, v_date;
      END IF;
    END LOOP;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Release lodging rooms (increment availability)
CREATE OR REPLACE FUNCTION release_lodging_rooms(
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
BEGIN
  -- Release each room type for each date
  FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
    LOOP
      UPDATE lodging_availability
      SET rooms_available = LEAST(rooms_available + v_quantity, rooms_total),
          updated_at = NOW()
      WHERE room_type_id = v_room_type_id
        AND date = v_date;

      -- If no availability record, this is OK (no-op)
    END LOOP;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Reserve trip seats (decrement availability)
CREATE OR REPLACE FUNCTION reserve_trip_seats(
  p_departure_id UUID,
  p_party_size INT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE trip_departures
  SET seats_available = seats_available - p_party_size,
      updated_at = NOW()
  WHERE id = p_departure_id
    AND seats_available >= p_party_size
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient seats or invalid departure status for departure %', p_departure_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Release trip seats (increment availability)
CREATE OR REPLACE FUNCTION release_trip_seats(
  p_departure_id UUID,
  p_party_size INT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE trip_departures
  SET seats_available = LEAST(seats_available + p_party_size, seats_total),
      updated_at = NOW()
  WHERE id = p_departure_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Reserve activity capacity
CREATE OR REPLACE FUNCTION reserve_activity_capacity(
  p_session_id UUID,
  p_party_size INT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE activity_sessions
  SET capacity_available = capacity_available - p_party_size,
      updated_at = NOW()
  WHERE id = p_session_id
    AND capacity_available >= p_party_size
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient capacity or invalid session status for session %', p_session_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Release activity capacity
CREATE OR REPLACE FUNCTION release_activity_capacity(
  p_session_id UUID,
  p_party_size INT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE activity_sessions
  SET capacity_available = LEAST(capacity_available + p_party_size, capacity_total),
      updated_at = NOW()
  WHERE id = p_session_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ATOMIC BOOKING CREATION WITH AVAILABILITY CHECK
-- =====================================================

CREATE OR REPLACE FUNCTION create_booking_with_availability(
  p_experience_id UUID,
  p_guest_id UUID,
  p_host_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_adults INT,
  p_children INT DEFAULT 0,
  p_infants INT DEFAULT 0,
  p_departure_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_rooms JSONB DEFAULT NULL,
  p_price_subtotal_cents INT DEFAULT 0,
  p_price_fees_cents INT DEFAULT 0,
  p_price_taxes_cents INT DEFAULT 0,
  p_price_total_cents INT DEFAULT 0,
  p_currency TEXT DEFAULT 'MAD',
  p_guest_notes TEXT DEFAULT NULL
) RETURNS TABLE (
  booking_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_experience_type experience_type;
  v_booking_id UUID;
  v_party_size INT;
  v_available BOOLEAN;
  v_avail_message TEXT;
BEGIN
  -- Calculate total party size
  v_party_size := p_adults + p_children;

  -- Get experience type
  SELECT type INTO v_experience_type
  FROM experiences
  WHERE id = p_experience_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Experience not found'::TEXT;
    RETURN;
  END IF;

  -- Check availability based on experience type
  IF v_experience_type = 'lodging' THEN
    -- Check lodging availability
    SELECT available, message INTO v_available, v_avail_message
    FROM check_lodging_availability(p_experience_id, p_from_date, p_to_date, p_rooms);

    IF NOT v_available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_message;
      RETURN;
    END IF;

    -- Reserve rooms
    PERFORM reserve_lodging_rooms(p_from_date, p_to_date, p_rooms);

  ELSIF v_experience_type = 'trip' THEN
    -- Check trip availability
    IF p_departure_id IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Departure ID required for trip bookings'::TEXT;
      RETURN;
    END IF;

    SELECT available, message INTO v_available, v_avail_message
    FROM check_trip_availability(p_departure_id, v_party_size);

    IF NOT v_available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_message;
      RETURN;
    END IF;

    -- Reserve seats
    PERFORM reserve_trip_seats(p_departure_id, v_party_size);

  ELSIF v_experience_type = 'activity' THEN
    -- Check activity availability
    IF p_session_id IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Session ID required for activity bookings'::TEXT;
      RETURN;
    END IF;

    SELECT available, message INTO v_available, v_avail_message
    FROM check_activity_availability(p_session_id, v_party_size);

    IF NOT v_available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_message;
      RETURN;
    END IF;

    -- Reserve capacity
    PERFORM reserve_activity_capacity(p_session_id, v_party_size);
  END IF;

  -- Create booking
  INSERT INTO bookings (
    experience_id,
    guest_id,
    host_id,
    from_date,
    to_date,
    adults,
    children,
    infants,
    departure_id,
    rooms,
    price_subtotal_cents,
    price_fees_cents,
    price_taxes_cents,
    price_total_cents,
    currency,
    guest_notes,
    status
  ) VALUES (
    p_experience_id,
    p_guest_id,
    p_host_id,
    p_from_date,
    p_to_date,
    p_adults,
    p_children,
    p_infants,
    p_departure_id,
    p_rooms,
    p_price_subtotal_cents,
    p_price_fees_cents,
    p_price_taxes_cents,
    p_price_total_cents,
    p_currency,
    p_guest_notes,
    'pending_host'
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, TRUE, 'Booking created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AVAILABILITY MANAGEMENT
-- =====================================================

-- Trigger function: Release inventory when booking is cancelled
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

    ELSIF v_experience_type = 'activity' THEN
      -- Assuming we add session_id to bookings table for activities
      -- PERFORM release_activity_capacity(NEW.session_id, v_party_size);
      NULL; -- Placeholder for now
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_cancelled ON bookings;

CREATE TRIGGER trg_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION on_booking_cancelled();

-- Trigger function: Release inventory when booking is declined by host
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

    ELSIF v_experience_type = 'activity' THEN
      NULL; -- Placeholder
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_declined ON bookings;

CREATE TRIGGER trg_booking_declined
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'declined')
  EXECUTE FUNCTION on_booking_declined();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Get available room count for a specific date
CREATE OR REPLACE FUNCTION get_available_rooms(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
DECLARE
  v_available INT;
  v_total INT;
BEGIN
  SELECT rooms_available INTO v_available
  FROM lodging_availability
  WHERE room_type_id = p_room_type_id
    AND date = p_date;

  IF FOUND THEN
    RETURN v_available;
  ELSE
    -- If no record, return total rooms from room type
    SELECT total_rooms INTO v_total
    FROM lodging_room_types
    WHERE id = p_room_type_id;

    RETURN COALESCE(v_total, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Get minimum available rooms across a date range
CREATE OR REPLACE FUNCTION get_min_available_rooms(
  p_room_type_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS INT AS $$
DECLARE
  v_min_available INT;
  v_date DATE;
  v_current_available INT;
BEGIN
  v_min_available := 999999; -- Start with large number

  FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
  LOOP
    v_current_available := get_available_rooms(p_room_type_id, v_date);
    v_min_available := LEAST(v_min_available, v_current_available);
  END LOOP;

  RETURN v_min_available;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION check_lodging_availability IS
  'Check if requested rooms are available for the given date range';

COMMENT ON FUNCTION check_trip_availability IS
  'Check if a trip departure has enough seats for the party size';

COMMENT ON FUNCTION check_activity_availability IS
  'Check if an activity session has enough capacity for the party size';

COMMENT ON FUNCTION create_booking_with_availability IS
  'Atomically create a booking with availability checking and inventory reservation';

COMMENT ON FUNCTION reserve_lodging_rooms IS
  'Decrement available room count for a date range (called within transaction)';

COMMENT ON FUNCTION release_lodging_rooms IS
  'Increment available room count when booking is cancelled or declined';

COMMENT ON FUNCTION initialize_lodging_availability IS
  'Create availability records for a room type across a date range';

COMMENT ON FUNCTION get_available_rooms IS
  'Get the number of available rooms for a specific room type and date';

COMMENT ON FUNCTION get_min_available_rooms IS
  'Get the minimum available rooms across a date range (bottleneck availability)';
