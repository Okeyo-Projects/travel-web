-- =====================================================
-- REFACTOR TO LAZY AVAILABILITY TRACKING
-- =====================================================
-- Instead of pre-creating availability records, calculate
-- availability on-demand from bookings table
-- This eliminates initialization complexity and storage overhead
-- =====================================================

-- =====================================================
-- HELPER: Calculate booked rooms for a specific date and room type
-- =====================================================

CREATE OR REPLACE FUNCTION get_booked_rooms_count(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
DECLARE
  v_booked_count INT := 0;
  v_booking RECORD;
BEGIN
  -- Sum up all rooms booked for this room type on this date
  -- A booking covers a date if: from_date <= date < to_date
  FOR v_booking IN
    SELECT rooms
    FROM bookings
    WHERE from_date <= p_date
      AND to_date > p_date
      AND status NOT IN ('cancelled', 'declined')
      AND rooms IS NOT NULL
  LOOP
    -- Extract quantity for this room type from JSONB
    -- rooms format: [{"room_type_id": "uuid", "quantity": 2}]
    SELECT COALESCE(
      SUM((room->>'quantity')::INT),
      0
    ) INTO v_booked_count
    FROM jsonb_array_elements(v_booking.rooms) AS room
    WHERE (room->>'room_type_id')::UUID = p_room_type_id;

    v_booked_count := COALESCE(v_booked_count, 0);
  END LOOP;

  RETURN COALESCE(v_booked_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- More efficient version using aggregation
CREATE OR REPLACE FUNCTION get_booked_rooms_count(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
  SELECT COALESCE(SUM((room->>'quantity')::INT), 0)::INT
  FROM bookings b,
       jsonb_array_elements(b.rooms) AS room
  WHERE b.from_date <= p_date
    AND b.to_date > p_date
    AND b.status NOT IN ('cancelled', 'declined')
    AND b.rooms IS NOT NULL
    AND (room->>'room_type_id')::UUID = p_room_type_id;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- UPDATE: Check lodging availability (calculate from bookings)
-- =====================================================

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
  v_total_rooms INT;
  v_booked_count INT;
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

    -- Get total rooms for this room type
    SELECT total_rooms INTO v_total_rooms
    FROM lodging_room_types
    WHERE id = v_room_type_id
      AND experience_id = p_experience_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE,
                          format('Room type %s not found', v_room_type_id)::TEXT,
                          ARRAY[]::DATE[],
                          '[]'::JSONB;
      RETURN;
    END IF;

    -- Check availability for each date in range
    FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
    LOOP
      -- Calculate booked rooms for this date
      v_booked_count := get_booked_rooms_count(v_room_type_id, v_date);

      -- Calculate available
      v_available_count := v_total_rooms - v_booked_count;

      -- Check if enough rooms available
      IF v_available_count < v_quantity THEN
        v_all_available := FALSE;
        v_unavailable_dates := array_append(v_unavailable_dates, v_date);

        v_conflicts := v_conflicts || jsonb_build_object(
          'room_type_id', v_room_type_id,
          'date', v_date,
          'requested', v_quantity,
          'available', v_available_count,
          'total', v_total_rooms,
          'booked', v_booked_count
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
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- UPDATE: Get blocked dates (calculate from bookings)
-- =====================================================

CREATE OR REPLACE FUNCTION get_lodging_blocked_dates(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB -- [{"room_type_id": "uuid", "quantity": 1}]
) RETURNS TABLE (blocked_date DATE) AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
  v_total_rooms INT;
  v_booked_count INT;
  v_available_count INT;
  v_blocked_dates DATE[] := ARRAY[]::DATE[];
BEGIN
  -- For each requested room type
  FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    -- Get total rooms
    SELECT total_rooms INTO v_total_rooms
    FROM lodging_room_types
    WHERE id = v_room_type_id
      AND experience_id = p_experience_id
      AND deleted_at IS NULL;

    IF FOUND AND v_total_rooms > 0 THEN
      -- Check each date in range
      FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date + INTERVAL '1 day'))
      LOOP
        -- Calculate booked rooms
        v_booked_count := get_booked_rooms_count(v_room_type_id, v_date);
        v_available_count := v_total_rooms - v_booked_count;

        -- If not enough available, mark as blocked
        IF v_available_count < v_quantity THEN
          -- Add to blocked dates if not already there
          IF NOT (v_date = ANY(v_blocked_dates)) THEN
            v_blocked_dates := array_append(v_blocked_dates, v_date);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Return blocked dates
  RETURN QUERY SELECT unnest(v_blocked_dates) AS blocked_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SIMPLIFY: Reservation functions (now no-ops)
-- =====================================================

-- Reserve lodging rooms - now just validates availability
-- Actual reservation happens via booking creation
CREATE OR REPLACE FUNCTION reserve_lodging_rooms(
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  -- No-op: Bookings themselves represent reservations
  -- Availability is calculated on-demand
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Release lodging rooms - now a no-op
CREATE OR REPLACE FUNCTION release_lodging_rooms(
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  -- No-op: Deleting/cancelling booking is enough
  -- Availability is recalculated on-demand
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE: Booking creation function
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
  v_avail_result RECORD;
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
    -- Check lodging availability (now calculates from bookings)
    SELECT * INTO v_avail_result
    FROM check_lodging_availability(p_experience_id, p_from_date, p_to_date, p_rooms);

    IF NOT v_avail_result.available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_result.message;
      RETURN;
    END IF;

    -- No need to call reserve_lodging_rooms - booking creation is the reservation

  ELSIF v_experience_type = 'trip' THEN
    -- Check trip availability
    IF p_departure_id IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Departure ID required for trip bookings'::TEXT;
      RETURN;
    END IF;

    SELECT * INTO v_avail_result
    FROM check_trip_availability(p_departure_id, v_party_size);

    IF NOT v_avail_result.available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_result.message;
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

    SELECT * INTO v_avail_result
    FROM check_activity_availability(p_session_id, v_party_size);

    IF NOT v_avail_result.available THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, v_avail_result.message;
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
-- REMOVE: Old initialization functions
-- =====================================================

-- Drop initialization functions (no longer needed)
DROP FUNCTION IF EXISTS initialize_lodging_availability(UUID, UUID, DATE, DATE);
DROP FUNCTION IF EXISTS extend_availability_for_all_lodging();

-- =====================================================
-- UTILITY: Get available rooms for a date
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_rooms(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
DECLARE
  v_total_rooms INT;
  v_booked_count INT;
BEGIN
  -- Get total rooms
  SELECT total_rooms INTO v_total_rooms
  FROM lodging_room_types
  WHERE id = p_room_type_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get booked count
  v_booked_count := get_booked_rooms_count(p_room_type_id, p_date);

  -- Return available
  RETURN v_total_rooms - v_booked_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- UTILITY: Get minimum available rooms across date range
-- =====================================================

CREATE OR REPLACE FUNCTION get_min_available_rooms(
  p_room_type_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS INT AS $$
DECLARE
  v_min_available INT := 999999;
  v_date DATE;
  v_current_available INT;
BEGIN
  FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
  LOOP
    v_current_available := get_available_rooms(p_room_type_id, v_date);
    v_min_available := LEAST(v_min_available, v_current_available);
  END LOOP;

  RETURN v_min_available;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- INDEXES for performance
-- =====================================================

-- Ensure we have indexes for efficient booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status
  ON bookings(from_date, to_date, status)
  WHERE status NOT IN ('cancelled', 'declined');

CREATE INDEX IF NOT EXISTS idx_bookings_rooms_gin
  ON bookings USING gin(rooms);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_booked_rooms_count IS
  'Calculate how many rooms of a specific type are booked on a given date';

COMMENT ON FUNCTION check_lodging_availability IS
  'Check room availability by calculating from existing bookings (no pre-created records needed)';

COMMENT ON FUNCTION get_lodging_blocked_dates IS
  'Get dates where requested rooms are not available (calculated from bookings)';

COMMENT ON FUNCTION reserve_lodging_rooms IS
  'No-op function: booking creation itself represents reservation';

COMMENT ON FUNCTION release_lodging_rooms IS
  'No-op function: booking cancellation automatically frees up availability';

COMMENT ON FUNCTION get_available_rooms IS
  'Get available room count for a specific date (total - booked)';
