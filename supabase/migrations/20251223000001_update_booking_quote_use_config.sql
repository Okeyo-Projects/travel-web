-- Update get_booking_quote to use config table for fees and taxes
-- This replaces hardcoded 0.05 and 0.08 with values from the config table

CREATE OR REPLACE FUNCTION get_booking_quote(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_adults INT,
  p_children INT DEFAULT 0,
  p_infants INT DEFAULT 0,
  p_rooms TEXT DEFAULT NULL,
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

  -- For activities
  v_metadata JSONB;
  v_base_price NUMERIC;
  v_per_guest_cents INT;
  v_total_guests INT;
  
  -- For promotions
  v_promotion RECORD;
  v_best_promotion RECORD;
  v_promotion_message TEXT;
  v_current_discount INT;
  v_best_discount INT := 0;
  
  -- For rooms JSONB conversion
  v_rooms_jsonb JSONB;
  
  -- Config values
  v_service_fee_percentage NUMERIC := 0.05;
  v_vat_percentage NUMERIC := 0.08;
BEGIN
  -- Fetch config values
  SELECT 
    COALESCE((SELECT (value->>'value')::NUMERIC FROM config WHERE key = 'service_fee_percentage'), 0.05),
    COALESCE((SELECT (value->>'value')::NUMERIC FROM config WHERE key = 'vat_percentage'), 0.08)
  INTO v_service_fee_percentage, v_vat_percentage;

  -- 1. Get experience details (with table alias to avoid ambiguity)
  SELECT e.type, e.metadata INTO v_experience_type, v_metadata
  FROM experiences e
  WHERE e.id = p_experience_id AND e.status = 'published';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 0, '[]'::JSONB,
                        FALSE, 'Experience not found or not published'::TEXT;
    RETURN;
  END IF;

  -- 2. Calculate Base Price
  
  -- Lodging Nights
  IF v_experience_type = 'lodging' THEN
    v_nights := GREATEST(p_to_date - p_from_date, 1);
  END IF;

  -- Lodging Calculation
  IF v_experience_type = 'lodging' THEN
    -- Handle p_rooms: convert TEXT (JSON string) to JSONB and validate
    IF p_rooms IS NULL OR p_rooms = '' THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                          FALSE, 'No rooms specified'::TEXT;
      RETURN;
    END IF;

    -- Cast TEXT to JSONB (client sends JSON.stringify result)
    BEGIN
      v_rooms_jsonb := p_rooms::JSONB;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                          FALSE, 'Invalid rooms JSON format'::TEXT;
      RETURN;
    END;

    -- Validate it's an array with elements
    IF jsonb_typeof(v_rooms_jsonb) != 'array' THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                          FALSE, 'Rooms must be an array'::TEXT;
      RETURN;
    END IF;

    IF jsonb_array_length(v_rooms_jsonb) = 0 THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, v_nights, '[]'::JSONB,
                          FALSE, 'No rooms specified'::TEXT;
      RETURN;
    END IF;

    FOR v_room IN SELECT * FROM jsonb_array_elements(v_rooms_jsonb)
    LOOP
      v_room_type_id := (v_room->>'room_type_id')::UUID;
      v_quantity := (v_room->>'quantity')::INT;

      -- Use table alias to avoid currency column ambiguity
      SELECT lrt.price_cents, lrt.currency, lrt.name
      INTO v_room_price_cents, v_room_currency, v_room_name
      FROM lodging_room_types lrt
      WHERE lrt.id = v_room_type_id 
        AND lrt.experience_id = p_experience_id 
        AND lrt.deleted_at IS NULL;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      v_room_line_total := v_room_price_cents * v_quantity * v_nights;
      v_subtotal := v_subtotal + v_room_line_total;
      v_currency := COALESCE(v_room_currency, v_currency);

      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s × %s', COALESCE(v_room_name, 'Room'), v_quantity),
        'amount_cents', v_room_line_total
      );
    END LOOP;

  -- Trip Calculation
  ELSIF v_experience_type = 'trip' THEN
    IF p_departure_id IS NULL THEN
      RETURN QUERY SELECT 0, 0, 0, 0, 0, 'MAD'::TEXT, 1, '[]'::JSONB,
                          FALSE, 'Departure required'::TEXT;
      RETURN;
    END IF;

    -- Use table alias to avoid currency column ambiguity
    SELECT et.price_cents, et.price_children_cents, et.currency
    INTO v_trip_price_cents, v_trip_child_price_cents, v_trip_currency
    FROM experiences_trip et
    WHERE et.experience_id = p_experience_id;

    v_currency := COALESCE(v_trip_currency, v_currency);

    IF p_adults > 0 AND v_trip_price_cents IS NOT NULL THEN
      v_adults_total := v_trip_price_cents * p_adults;
      v_subtotal := v_subtotal + v_adults_total;
      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s adult%s', p_adults, CASE WHEN p_adults > 1 THEN 's' ELSE '' END),
        'amount_cents', v_adults_total
      );
    END IF;

    IF p_children > 0 THEN
      v_trip_child_price_cents := COALESCE(v_trip_child_price_cents, v_trip_price_cents);
      v_children_total := v_trip_child_price_cents * p_children;
      v_subtotal := v_subtotal + v_children_total;
      v_breakdown := v_breakdown || jsonb_build_object(
        'label', format('%s child%s', p_children, CASE WHEN p_children > 1 THEN 'ren' ELSE '' END),
        'amount_cents', v_children_total
      );
    END IF;

  -- Activity Calculation
  ELSIF v_experience_type = 'activity' THEN
    v_base_price := NULL;
    IF v_metadata IS NOT NULL THEN
      v_base_price := COALESCE(
        (v_metadata->'pricing'->>'startingPrice')::NUMERIC,
        (v_metadata->'pricing'->>'basePrice')::NUMERIC,
        (v_metadata->>'startingPrice')::NUMERIC,
        (v_metadata->>'basePrice')::NUMERIC
      );
      -- Extract currency from metadata (no ambiguity as it's JSONB extraction)
      v_currency := COALESCE(
        (v_metadata->'pricing'->>'currency')::TEXT,
        (v_metadata->>'currency')::TEXT,
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
    END IF;
  END IF;

  -- 3. Promotion Logic (Auto-apply best promotion if no code provided)
  IF p_user_id IS NOT NULL AND v_subtotal > 0 THEN
    
    -- Case A: User provided a specific code
    IF p_promotion_code IS NOT NULL THEN
      SELECT * INTO v_promotion
      FROM promotions p
      WHERE (lower(p.code) = lower(p_promotion_code) AND p.is_case_sensitive = false
             OR p.code = p_promotion_code AND p.is_case_sensitive = true)
        AND p.status = 'active';

      IF FOUND THEN
        IF is_promotion_available(v_promotion.id, p_user_id, v_subtotal, p_experience_id) THEN
          v_discount := calculate_discount_amount(v_promotion.id, v_subtotal);
          v_promotion_message := format('Code "%s" applied', v_promotion.code);
        ELSE
          v_promotion_message := format('Code "%s" invalid for this booking', p_promotion_code);
        END IF;
      ELSE
        v_promotion_message := 'Invalid promo code';
      END IF;

    -- Case B: No code provided -> Find best Auto-Apply promotion
    ELSE
      -- Find all active auto-apply promotions
      FOR v_promotion IN 
        SELECT * FROM promotions p
        WHERE p.auto_apply = true 
          AND p.status = 'active'
          AND (p.valid_until IS NULL OR p.valid_until > NOW())
          AND p.valid_from <= NOW()
          -- Optimization: pre-filter by experience if applicable
          AND (p.applicable_experience_ids IS NULL OR p_experience_id = ANY(p.applicable_experience_ids))
      LOOP
        -- Check specific eligibility (limits, first booking, etc.)
        IF is_promotion_available(v_promotion.id, p_user_id, v_subtotal, p_experience_id) THEN
          v_current_discount := calculate_discount_amount(v_promotion.id, v_subtotal);
          
          -- Keep the best one
          IF v_current_discount > v_best_discount THEN
            v_best_discount := v_current_discount;
            v_best_promotion := v_promotion;
          END IF;
        END IF;
      END LOOP;

      -- Apply the best found promotion
      IF v_best_promotion IS NOT NULL THEN
        v_discount := v_best_discount;
        v_promotion_message := format('%s applied', v_best_promotion.name);
      END IF;
    END IF;
  END IF;

  -- 4. Add Discount to Breakdown
  IF v_discount > 0 THEN
    v_breakdown := v_breakdown || jsonb_build_object(
      'label', COALESCE(v_promotion_message, 'Discount'),
      'amount_cents', -v_discount,
      'type', 'discount'
    );
  END IF;

  -- 5. Calculate Final Fees (using config values instead of hardcoded)
  v_fees := ROUND(v_subtotal * v_service_fee_percentage);
  v_taxes := ROUND(v_subtotal * v_vat_percentage);
  v_total := v_subtotal + v_fees + v_taxes - v_discount;

  -- Add fees/taxes to breakdown
  IF v_fees > 0 THEN
    v_breakdown := v_breakdown || jsonb_build_object('label', 'Service fees', 'amount_cents', v_fees);
  END IF;
  IF v_taxes > 0 THEN
    v_breakdown := v_breakdown || jsonb_build_object('label', 'Estimated taxes', 'amount_cents', v_taxes);
  END IF;

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
    COALESCE(v_promotion_message, 'Quote calculated')::TEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_booking_quote(UUID, DATE, DATE, INT, INT, INT, TEXT, UUID, TEXT, UUID) IS
  'Calculate booking quote with fees and taxes from config table. Accepts p_rooms as TEXT (JSON string from client). All column references are qualified with table aliases to avoid ambiguity.';
