-- =====================================================
-- ENSURE get_booking_quote FUNCTION EXISTS
-- =====================================================
-- This migration ensures the get_booking_quote function
-- is created if it doesn't already exist.
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
  -- Only apply promotion if helper functions exist
  IF p_promotion_code IS NOT NULL AND p_user_id IS NOT NULL AND v_subtotal > 0 THEN
    -- Check if promotion helper functions exist
    IF EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'is_promotion_available' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) AND EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'calculate_discount_amount' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
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

-- Add comment for documentation
COMMENT ON FUNCTION get_booking_quote(UUID, DATE, DATE, INT, INT, INT, JSONB, UUID, TEXT, UUID) IS
  'Calculate booking quote with server-enforced pricing. Replaces client-side calculateBookingQuote().';

