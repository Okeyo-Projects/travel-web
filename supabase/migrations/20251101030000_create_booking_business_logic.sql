-- =====================================================
-- BOOKING BUSINESS LOGIC FUNCTIONS
-- =====================================================
-- This migration moves critical business logic from client to server:
-- 1. Pricing calculations (security-critical)
-- 2. Booking status management (state machine enforcement)
-- 3. Unified booking detail API
-- =====================================================

-- =====================================================
-- PRICING CALCULATION (REPLACES CLIENT-SIDE LOGIC)
-- =====================================================

-- Calculate booking quote with proper business rules
CREATE OR REPLACE FUNCTION get_booking_quote(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_adults INT,
  p_children INT DEFAULT 0,
  p_infants INT DEFAULT 0,
  p_rooms JSONB DEFAULT NULL,
  p_departure_id UUID DEFAULT NULL,
  p_promotion_code TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
  subtotal_cents INT,
  fees_cents INT,
  taxes_cents INT,
  discount_cents INT,
  total_cents INT,
  currency TEXT,
  nights INT,
  breakdown JSONB,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_experience_type experience_type;
  v_subtotal INT := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_currency TEXT := 'MAD';
  v_nights INT := 1;
  v_fees INT;
  v_taxes INT;
  v_total INT;
  v_discount INT := 0;

  -- For lodging
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_room_price_cents INT;
  v_room_currency TEXT;
  v_room_name TEXT;
  v_room_line_total INT;

  -- For trips
  v_trip_price_cents INT;
  v_trip_child_price_cents INT;
  v_trip_currency TEXT;
  v_adults_total INT;
  v_children_total INT;

  -- For activities (metadata-based)
  v_metadata JSONB;
  v_base_price NUMERIC;
  v_per_guest_cents INT;
  v_total_guests INT;
  
  -- For promotions
  v_promotion RECORD;
  v_promotion_message TEXT;
BEGIN
  -- Get experience type
  SELECT type, metadata INTO v_experience_type, v_metadata
  FROM experiences
  WHERE id = p_experience_id AND status = 'published';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 0, '[]'::JSONB,
                        FALSE, 'Experience not found or not published'::TEXT;
    RETURN;
  END IF;

  -- Calculate nights for lodging
  IF v_experience_type = 'lodging' THEN
    v_nights := GREATEST(p_to_date - p_from_date, 1);
  END IF;

  -- ===== LODGING PRICING =====
  IF v_experience_type = 'lodging' THEN
    IF p_rooms IS NULL OR jsonb_array_length(p_rooms) = 0 THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                          FALSE, 'No rooms specified for lodging booking'::TEXT;
      RETURN;
    END IF;

    -- Calculate each room type cost
    FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
    LOOP
      v_room_type_id := (v_room->>'room_type_id')::UUID;
      v_quantity := (v_room->>'quantity')::INT;

      -- Get room pricing
      SELECT price_cents, currency, name
      INTO v_room_price_cents, v_room_currency, v_room_name
      FROM lodging_room_types
      WHERE id = v_room_type_id AND experience_id = p_experience_id AND deleted_at IS NULL;

      IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                            FALSE, format('Room type %s not found', v_room_type_id)::TEXT;
        RETURN;
      END IF;

      -- Calculate line total (price * quantity * nights)
      v_room_line_total := v_room_price_cents * v_quantity * v_nights;
      v_subtotal := v_subtotal + v_room_line_total;
      v_currency := COALESCE(v_room_currency, v_currency);

      -- Add to breakdown
      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s × %s', COALESCE(v_room_name, 'Room'), v_quantity),
        'amount_cents', v_room_line_total
      );
    END LOOP;

  -- ===== TRIP PRICING =====
  ELSIF v_experience_type = 'trip' THEN
    IF p_departure_id IS NULL THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 1, '[]'::JSONB,
                          FALSE, 'Departure ID required for trip bookings'::TEXT;
      RETURN;
    END IF;

    -- Get trip pricing
    SELECT
      et.price_cents,
      et.price_children_cents,
      et.currency
    INTO v_trip_price_cents, v_trip_child_price_cents, v_trip_currency
    FROM experiences_trip et
    WHERE et.experience_id = p_experience_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 1, '[]'::JSONB,
                          FALSE, 'Trip details not found'::TEXT;
      RETURN;
    END IF;

    v_currency := COALESCE(v_trip_currency, v_currency);

    -- Adults pricing
    IF p_adults > 0 AND v_trip_price_cents IS NOT NULL THEN
      v_adults_total := v_trip_price_cents * p_adults;
      v_subtotal := v_subtotal + v_adults_total;

      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s adult%s', p_adults, CASE WHEN p_adults > 1 THEN 's' ELSE '' END),
        'amount_cents', v_adults_total
      );
    END IF;

    -- Children pricing
    IF p_children > 0 THEN
      v_trip_child_price_cents := COALESCE(v_trip_child_price_cents, v_trip_price_cents);
      v_children_total := v_trip_child_price_cents * p_children;
      v_subtotal := v_subtotal + v_children_total;

      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s child%s', p_children, CASE WHEN p_children > 1 THEN 'ren' ELSE '' END),
        'amount_cents', v_children_total
      );
    END IF;

  -- ===== ACTIVITY PRICING (METADATA-BASED) =====
  ELSIF v_experience_type = 'activity' THEN
    -- Try to extract price from metadata
    v_base_price := NULL;

    IF v_metadata IS NOT NULL THEN
      -- Check various metadata paths for pricing
      v_base_price := COALESCE(
        (v_metadata->'pricing'->>'startingPrice')::NUMERIC,
        (v_metadata->'pricing'->>'basePrice')::NUMERIC,
        (v_metadata->>'startingPrice')::NUMERIC,
        (v_metadata->>'basePrice')::NUMERIC
      );

      v_currency := COALESCE(
        v_metadata->'pricing'->>'currency',
        v_metadata->>'currency',
        v_currency
      );
    END IF;

    IF v_base_price IS NOT NULL THEN
      v_per_guest_cents := ROUND(v_base_price * 100);
      v_total_guests := GREATEST(p_adults + p_children + p_infants, 1);
      v_subtotal := v_per_guest_cents * v_total_guests;

      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s participant%s', v_total_guests, CASE WHEN v_total_guests > 1 THEN 's' ELSE '' END),
        'amount_cents', v_subtotal
      );
    ELSE
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 1, '[]'::JSONB,
                          FALSE, 'Activity pricing not configured'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate fees (5% of subtotal)
  v_fees := ROUND(v_subtotal * 0.05);

  -- Calculate taxes (8% of subtotal)
  v_taxes := ROUND(v_subtotal * 0.08);

  -- ===== PROMOTION LOGIC =====
  IF p_promotion_code IS NOT NULL AND p_user_id IS NOT NULL AND v_subtotal > 0 THEN
    -- Find promotion by code
    SELECT * INTO v_promotion
    FROM promotions
    WHERE (
      lower(code) = lower(p_promotion_code) AND is_case_sensitive = false
      OR code = p_promotion_code AND is_case_sensitive = true
    )
    AND status = 'active';

    IF FOUND THEN
      -- Check if promotion is available for this user and booking
      IF is_promotion_available(v_promotion.id, p_user_id, v_subtotal, p_experience_id) THEN
        v_discount := calculate_discount_amount(v_promotion.id, v_subtotal);
        
        IF v_discount > 0 THEN
          v_breakdown := v_breakdown || jsonb_build_object(
            'label', format('Discount (%s)', v_promotion.name),
            'amount_cents', -v_discount
          );
          v_promotion_message := format('Promotion "%s" applied successfully.', v_promotion.name);
        END IF;
      ELSE
        v_promotion_message := format('Promotion "%s" is not valid for this booking.', p_promotion_code);
      END IF;
    ELSE
      v_promotion_message := format('Promotion code "%s" not found or is inactive.', p_promotion_code);
    END IF;
  END IF;

  -- Calculate total
  v_total := v_subtotal + v_fees + v_taxes - v_discount;

  -- Add fees and taxes to breakdown
  IF v_fees > 0 THEN
    v_breakdown := v_breakdown || jsonb_build_object(
      'label', 'Service fees',
      'amount_cents', v_fees
    );
  END IF;

  IF v_taxes > 0 THEN
    v_breakdown := v_breakdown || jsonb_build_object(
      'label', 'Estimated taxes',
      'amount_cents', v_taxes
    );
  END IF;

  -- Return successful quote
  RETURN QUERY SELECT
    v_subtotal,
    v_fees,
    v_taxes,
    v_discount,
    v_total,
    v_currency,
    v_nights,
    v_breakdown,
    TRUE,
    COALESCE(v_promotion_message, 'Quote calculated successfully')::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HOST BOOKING RESPONSE (STATE MACHINE ENFORCEMENT)
-- =====================================================

CREATE OR REPLACE FUNCTION host_respond_to_booking(
  p_booking_id UUID,
  p_host_id UUID,
  p_response TEXT,  -- 'approved' or 'declined'
  p_message TEXT DEFAULT NULL,
  p_template TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_status booking_status,
  availability JSONB
) AS $$
DECLARE
  v_booking RECORD;
  v_new_status booking_status;
  v_experience_type experience_type;
  v_party_size INT;
  v_avail_result RECORD;
  v_availability_json JSONB := NULL;
BEGIN
  -- Get booking details
  SELECT
    b.*,
    e.type as exp_type
  INTO v_booking
  FROM bookings b
  JOIN experiences e ON e.id = b.experience_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found'::TEXT, NULL::booking_status, NULL::JSONB;
    RETURN;
  END IF;

  -- Verify host authorization
  IF v_booking.host_id != p_host_id THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: not the host of this booking'::TEXT,
                        NULL::booking_status, NULL::JSONB;
    RETURN;
  END IF;

  -- Verify current status allows host response
  IF v_booking.status != 'pending_host' THEN
    RETURN QUERY SELECT FALSE,
                        format('Cannot respond to booking in %s status', v_booking.status)::TEXT,
                        v_booking.status,
                        NULL::JSONB;
    RETURN;
  END IF;

  -- Determine new status
  IF p_response = 'approved' THEN
    v_new_status := 'approved';
  ELSIF p_response = 'declined' THEN
    v_new_status := 'declined';
  ELSE
    RETURN QUERY SELECT FALSE, 'Invalid response: must be "approved" or "declined"'::TEXT,
                        NULL::booking_status, NULL::JSONB;
    RETURN;
  END IF;

  -- Update booking status
  UPDATE bookings
  SET
    status = v_new_status,
    host_notes = COALESCE(p_message, p_template),
    host_response_template = p_template,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Get updated availability information
  v_experience_type := v_booking.exp_type;
  v_party_size := v_booking.adults + COALESCE(v_booking.children, 0);

  IF v_new_status = 'approved' THEN
    -- Check current availability after approval
    IF v_experience_type = 'trip' AND v_booking.departure_id IS NOT NULL THEN
      SELECT * INTO v_avail_result
      FROM check_trip_availability(v_booking.departure_id, v_party_size);

      v_availability_json := jsonb_build_object(
        'type', 'trip',
        'available', v_avail_result.seats_available,
        'total', v_avail_result.seats_total,
        'message', v_avail_result.message
      );

    ELSIF v_experience_type = 'lodging' AND v_booking.rooms IS NOT NULL THEN
      SELECT * INTO v_avail_result
      FROM check_lodging_availability(
        v_booking.experience_id,
        v_booking.from_date,
        v_booking.to_date,
        v_booking.rooms
      );

      v_availability_json := jsonb_build_object(
        'type', 'lodging',
        'available', v_avail_result.available,
        'message', v_avail_result.message,
        'unavailable_dates', v_avail_result.unavailable_dates,
        'room_conflicts', v_avail_result.room_conflicts
      );
    END IF;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    format('Booking %s successfully', v_new_status)::TEXT,
    v_new_status,
    v_availability_json;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET BOOKING DETAIL (UNIFIED API)
-- =====================================================

CREATE OR REPLACE FUNCTION get_booking_detail(
  p_booking_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_experience RECORD;
  v_guest RECORD;
  v_departure RECORD;
  v_availability RECORD;
  v_experience_type experience_type;
  v_party_size INT;
  v_result JSONB;
  v_availability_json JSONB := NULL;
  v_can_approve BOOLEAN := FALSE;
  v_can_cancel BOOLEAN := FALSE;
BEGIN
  -- Get booking with relations
  SELECT
    b.*,
    e.title as exp_title,
    e.type as exp_type,
    e.thumbnail_url as exp_thumbnail,
    e.city as exp_city,
    p.display_name as guest_name,
    p.avatar_url as guest_avatar
  INTO v_booking
  FROM bookings b
  JOIN experiences e ON e.id = b.experience_id
  LEFT JOIN profiles p ON p.id = b.guest_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Booking not found'
    );
  END IF;

  -- Verify access (guest or host only)
  IF v_booking.guest_id != p_user_id AND v_booking.host_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized access'
    );
  END IF;

  -- Determine permissions
  IF v_booking.host_id = p_user_id THEN
    v_can_approve := (v_booking.status = 'pending_host');
    v_can_cancel := (v_booking.status IN ('pending_host', 'approved', 'pending_payment', 'confirmed'));
  ELSIF v_booking.guest_id = p_user_id THEN
    v_can_cancel := (v_booking.status IN ('pending_host', 'approved', 'pending_payment', 'confirmed'));
  END IF;

  -- Get departure details for trips
  IF v_booking.departure_id IS NOT NULL THEN
    SELECT
      id,
      depart_at,
      return_at,
      seats_total,
      seats_available
    INTO v_departure
    FROM trip_departures
    WHERE id = v_booking.departure_id;
  END IF;

  -- Get current availability
  v_experience_type := v_booking.exp_type;
  v_party_size := v_booking.adults + COALESCE(v_booking.children, 0);

  IF v_experience_type = 'trip' AND v_booking.departure_id IS NOT NULL THEN
    SELECT * INTO v_availability
    FROM check_trip_availability(v_booking.departure_id, v_party_size);

    IF FOUND THEN
      v_availability_json := jsonb_build_object(
        'type', 'trip',
        'available', v_availability.seats_available,
        'total', v_availability.seats_total,
        'message', v_availability.message
      );
    END IF;

  ELSIF v_experience_type = 'lodging' AND v_booking.rooms IS NOT NULL THEN
    SELECT * INTO v_availability
    FROM check_lodging_availability(
      v_booking.experience_id,
      v_booking.from_date,
      v_booking.to_date,
      v_booking.rooms
    );

    IF FOUND THEN
      v_availability_json := jsonb_build_object(
        'type', 'lodging',
        'available', v_availability.available,
        'message', v_availability.message,
        'unavailable_dates', to_jsonb(v_availability.unavailable_dates),
        'room_conflicts', v_availability.room_conflicts
      );
    END IF;
  END IF;

  -- Build complete result
  v_result := jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'experience_id', v_booking.experience_id,
      'guest_id', v_booking.guest_id,
      'host_id', v_booking.host_id,
      'departure_id', v_booking.departure_id,
      'from_date', v_booking.from_date,
      'to_date', v_booking.to_date,
      'adults', v_booking.adults,
      'children', v_booking.children,
      'infants', v_booking.infants,
      'rooms', v_booking.rooms,
      'price_subtotal_cents', v_booking.price_subtotal_cents,
      'price_fees_cents', v_booking.price_fees_cents,
      'price_taxes_cents', v_booking.price_taxes_cents,
      'price_total_cents', v_booking.price_total_cents,
      'currency', v_booking.currency,
      'status', v_booking.status,
      'guest_notes', v_booking.guest_notes,
      'host_notes', v_booking.host_notes,
      'created_at', v_booking.created_at,
      'updated_at', v_booking.updated_at,
      'responded_at', v_booking.responded_at,
      'experience', jsonb_build_object(
        'id', v_booking.experience_id,
        'title', v_booking.exp_title,
        'type', v_booking.exp_type,
        'thumbnail_url', v_booking.exp_thumbnail,
        'city', v_booking.exp_city
      ),
      'guest', jsonb_build_object(
        'id', v_booking.guest_id,
        'display_name', v_booking.guest_name,
        'avatar_url', v_booking.guest_avatar
      ),
      'departure', CASE
        WHEN v_departure.id IS NOT NULL THEN jsonb_build_object(
          'id', v_departure.id,
          'depart_at', v_departure.depart_at,
          'return_at', v_departure.return_at,
          'seats_total', v_departure.seats_total,
          'seats_available', v_departure.seats_available
        )
        ELSE NULL
      END
    ),
    'availability', v_availability_json,
    'permissions', jsonb_build_object(
      'can_approve', v_can_approve,
      'can_cancel', v_can_cancel,
      'is_host', v_booking.host_id = p_user_id,
      'is_guest', v_booking.guest_id = p_user_id
    )
  );

  RETURN v_result;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_booking_quote IS
  'Calculate booking quote with server-enforced pricing. Replaces client-side calculateBookingQuote().';

COMMENT ON FUNCTION host_respond_to_booking IS
  'Host approve/decline booking with state machine enforcement and availability check.';

COMMENT ON FUNCTION get_booking_detail IS
  'Get complete booking details with availability and permissions in one call.';
