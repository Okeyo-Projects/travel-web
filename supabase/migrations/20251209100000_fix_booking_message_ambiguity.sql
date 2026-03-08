-- =====================================================
-- FIX AMBIGUOUS COLUMN REFERENCE IN BOOKING CREATION
-- =====================================================
-- This migration fixes the "column reference 'message' is ambiguous" error
-- in create_booking_with_availability function

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
    -- Check lodging availability
    -- FIX: Store result in RECORD to avoid ambiguity
    SELECT * INTO v_avail_result
    FROM check_lodging_availability(p_experience_id, p_from_date, p_to_date, p_rooms);

    v_available := v_avail_result.available;
    v_avail_message := v_avail_result.message;

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

    -- FIX: Store result in RECORD to avoid ambiguity
    SELECT * INTO v_avail_result
    FROM check_trip_availability(p_departure_id, v_party_size);

    v_available := v_avail_result.available;
    v_avail_message := v_avail_result.message;

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

    -- FIX: Store result in RECORD to avoid ambiguity
    SELECT * INTO v_avail_result
    FROM check_activity_availability(p_session_id, v_party_size);

    v_available := v_avail_result.available;
    v_avail_message := v_avail_result.message;

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
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION create_booking_with_availability IS
  'Fixed version: Resolves ambiguous column reference by using RECORD type for availability check results';
