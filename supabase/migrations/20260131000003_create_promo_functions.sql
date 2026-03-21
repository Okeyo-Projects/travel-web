-- =====================================================
-- PROMOTION HELPER FUNCTIONS
-- Functions to work with promotions in AI chat context
-- =====================================================

-- Function to get active promotions for an experience (lightweight for search results)
-- Returns summary info about active promotions
CREATE OR REPLACE FUNCTION experience_active_promos(exp_id UUID)
RETURNS TABLE (
  has_promo BOOLEAN,
  promo_count INT,
  best_badge TEXT,
  best_discount_type discount_type,
  best_discount_value NUMERIC,
  auto_apply_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) > 0 as has_promo,
    COUNT(*)::INT as promo_count,
    (SELECT badge_text FROM promotions 
     WHERE (scope = 'global' OR 
            (scope = 'host_specific' AND host_id = e.host_id) OR
            (scope = 'experience_specific' AND exp_id = ANY(applicable_experience_ids)))
       AND status = 'active'
       AND (valid_until IS NULL OR valid_until > NOW())
       AND show_badge = true
     ORDER BY priority DESC, discount_value DESC
     LIMIT 1) as best_badge,
    (SELECT discount_type FROM promotions 
     WHERE (scope = 'global' OR 
            (scope = 'host_specific' AND host_id = e.host_id) OR
            (scope = 'experience_specific' AND exp_id = ANY(applicable_experience_ids)))
       AND status = 'active'
       AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY priority DESC, discount_value DESC
     LIMIT 1) as best_discount_type,
    (SELECT discount_value FROM promotions 
     WHERE (scope = 'global' OR 
            (scope = 'host_specific' AND host_id = e.host_id) OR
            (scope = 'experience_specific' AND exp_id = ANY(applicable_experience_ids)))
       AND status = 'active'
       AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY priority DESC, discount_value DESC
     LIMIT 1) as best_discount_value,
    EXISTS(
      SELECT 1 FROM promotions 
      WHERE (scope = 'global' OR 
             (scope = 'host_specific' AND host_id = e.host_id) OR
             (scope = 'experience_specific' AND exp_id = ANY(applicable_experience_ids)))
        AND status = 'active'
        AND auto_apply = true
        AND (valid_until IS NULL OR valid_until > NOW())
    ) as auto_apply_available
  FROM experiences e
  WHERE e.id = exp_id
  GROUP BY e.host_id, e.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get applicable promotions with eligibility details
-- Used when showing detailed promo information to users
CREATE OR REPLACE FUNCTION get_applicable_promotions(
  exp_id UUID,
  p_user_id UUID DEFAULT NULL,
  check_in_date DATE DEFAULT NULL,
  nights INT DEFAULT NULL,
  guests INT DEFAULT NULL,
  amount_cents INT DEFAULT NULL
)
RETURNS TABLE (
  promotion_id UUID,
  promo_type promotion_type,
  name TEXT,
  description TEXT,
  code TEXT,
  discount_type discount_type,
  discount_value NUMERIC,
  max_discount_cents INT,
  badge_text TEXT,
  auto_apply BOOLEAN,
  is_eligible BOOLEAN,
  eligibility_reason TEXT,
  estimated_discount_cents INT
) AS $$
DECLARE
  exp_record RECORD;
  user_bookings_count INT;
  promo_record RECORD;
  is_user_first_booking BOOLEAN;
  days_before_exp INT;
  user_promo_usage_count INT;
  total_promo_usage INT;
  calculated_discount INT;
BEGIN
  -- Get experience details
  SELECT e.*, h.id as host_id
  INTO exp_record
  FROM experiences e
  LEFT JOIN hosts h ON h.id = e.host_id
  WHERE e.id = exp_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get user booking history if user_id provided
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO user_bookings_count
    FROM bookings
    WHERE user_id = p_user_id 
      AND status IN ('confirmed', 'completed', 'pending_payment');
    
    is_user_first_booking := (user_bookings_count = 0);
  ELSE
    user_bookings_count := 0;
    is_user_first_booking := true;
  END IF;
  
  -- Calculate days before experience if check-in date provided
  IF check_in_date IS NOT NULL THEN
    days_before_exp := check_in_date - CURRENT_DATE;
  END IF;
  
  -- Loop through all potentially applicable promotions
  FOR promo_record IN
    SELECT p.*
    FROM promotions p
    WHERE p.status = 'active'
      AND (p.valid_until IS NULL OR p.valid_until > NOW())
      AND (p.valid_from IS NULL OR p.valid_from <= NOW())
      AND (
        p.scope = 'global' OR
        (p.scope = 'host_specific' AND p.host_id = exp_record.host_id) OR
        (p.scope = 'experience_specific' AND exp_id = ANY(p.applicable_experience_ids))
      )
      AND (
        p.applicable_experience_types IS NULL OR
        exp_record.type::text = ANY(p.applicable_experience_types)
      )
    ORDER BY p.priority DESC, p.discount_value DESC
  LOOP
    -- Initialize eligibility
    is_eligible := true;
    eligibility_reason := NULL;
    
    -- Check first booking requirement
    IF promo_record.first_booking_only AND NOT is_user_first_booking THEN
      is_eligible := false;
      eligibility_reason := 'Only valid for first booking';
    END IF;
    
    -- Check minimum booking amount
    IF is_eligible AND promo_record.min_booking_amount_cents IS NOT NULL 
       AND (amount_cents IS NULL OR amount_cents < promo_record.min_booking_amount_cents) THEN
      is_eligible := false;
      eligibility_reason := 'Minimum booking amount not met: ' || 
                           (promo_record.min_booking_amount_cents / 100.0) || ' MAD required';
    END IF;
    
    -- Check minimum nights for lodging
    IF is_eligible AND promo_record.min_nights IS NOT NULL 
       AND (nights IS NULL OR nights < promo_record.min_nights) THEN
      is_eligible := false;
      eligibility_reason := 'Minimum ' || promo_record.min_nights || ' nights required';
    END IF;
    
    -- Check booking date range
    IF is_eligible AND check_in_date IS NOT NULL THEN
      IF promo_record.booking_date_from IS NOT NULL AND check_in_date < promo_record.booking_date_from THEN
        is_eligible := false;
        eligibility_reason := 'Experience must be on or after ' || promo_record.booking_date_from;
      END IF;
      
      IF promo_record.booking_date_until IS NOT NULL AND check_in_date > promo_record.booking_date_until THEN
        is_eligible := false;
        eligibility_reason := 'Experience must be on or before ' || promo_record.booking_date_until;
      END IF;
    END IF;
    
    -- Check days before experience (early bird / last minute)
    IF is_eligible AND days_before_exp IS NOT NULL THEN
      IF promo_record.min_days_before_experience IS NOT NULL 
         AND days_before_exp < promo_record.min_days_before_experience THEN
        is_eligible := false;
        eligibility_reason := 'Must book at least ' || promo_record.min_days_before_experience || ' days in advance';
      END IF;
      
      IF promo_record.max_days_before_experience IS NOT NULL 
         AND days_before_exp > promo_record.max_days_before_experience THEN
        is_eligible := false;
        eligibility_reason := 'Must book within ' || promo_record.max_days_before_experience || ' days of experience';
      END IF;
    END IF;
    
    -- Check usage limits
    IF is_eligible AND p_user_id IS NOT NULL THEN
      -- Check per-user usage limit
      IF promo_record.usage_limit_type IN ('once_per_user', 'limited_per_user') THEN
        SELECT COUNT(*) INTO user_promo_usage_count
        FROM promotion_usages
        WHERE promotion_id = promo_record.id
          AND user_id = p_user_id
          AND status = 'applied';
        
        IF promo_record.usage_limit_type = 'once_per_user' AND user_promo_usage_count > 0 THEN
          is_eligible := false;
          eligibility_reason := 'Already used this promotion';
        ELSIF promo_record.usage_limit_type = 'limited_per_user' 
              AND user_promo_usage_count >= promo_record.per_user_usage_limit THEN
          is_eligible := false;
          eligibility_reason := 'Reached usage limit for this promotion';
        END IF;
      END IF;
    END IF;
    
    -- Check total usage limit
    IF is_eligible AND promo_record.usage_limit_type IN ('once_total', 'limited_total') THEN
      total_promo_usage := promo_record.current_total_usage;
      
      IF promo_record.usage_limit_type = 'once_total' AND total_promo_usage > 0 THEN
        is_eligible := false;
        eligibility_reason := 'Promotion already claimed';
      ELSIF promo_record.usage_limit_type = 'limited_total' 
            AND total_promo_usage >= promo_record.total_usage_limit THEN
        is_eligible := false;
        eligibility_reason := 'Promotion limit reached';
      END IF;
    END IF;
    
    -- Calculate estimated discount if eligible and amount provided
    calculated_discount := NULL;
    IF is_eligible AND amount_cents IS NOT NULL THEN
      IF promo_record.discount_type = 'percentage' THEN
        calculated_discount := ROUND(amount_cents * promo_record.discount_value / 100.0);
        
        -- Apply max discount cap if set
        IF promo_record.max_discount_amount_cents IS NOT NULL 
           AND calculated_discount > promo_record.max_discount_amount_cents THEN
          calculated_discount := promo_record.max_discount_amount_cents;
        END IF;
      ELSIF promo_record.discount_type = 'fixed_amount' THEN
        calculated_discount := LEAST(promo_record.discount_value::INT, amount_cents);
      END IF;
    END IF;
    
    -- Return the promotion with eligibility info
    RETURN QUERY SELECT
      promo_record.id,
      promo_record.type,
      promo_record.name,
      promo_record.description,
      promo_record.code,
      promo_record.discount_type,
      promo_record.discount_value,
      promo_record.max_discount_amount_cents,
      promo_record.badge_text,
      promo_record.auto_apply,
      is_eligible,
      eligibility_reason,
      calculated_discount;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate a promo code
-- Returns validation result with discount calculation
CREATE OR REPLACE FUNCTION validate_promo_code(
  promo_code TEXT,
  exp_id UUID,
  p_user_id UUID DEFAULT NULL,
  check_in_date DATE DEFAULT NULL,
  nights INT DEFAULT NULL,
  guests INT DEFAULT NULL,
  amount_cents INT DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  promotion_id UUID,
  discount_cents INT,
  new_total_cents INT,
  error_message TEXT
) AS $$
DECLARE
  promo_record RECORD;
  applicable_promos RECORD;
BEGIN
  -- Find the promotion by code (case-insensitive if not case-sensitive)
  SELECT * INTO promo_record
  FROM promotions p
  WHERE (p.is_case_sensitive AND p.code = promo_code) OR
        (NOT p.is_case_sensitive AND LOWER(p.code) = LOWER(promo_code))
    AND p.status = 'active'
    AND p.type = 'promo_code';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::INT, NULL::INT, 'Invalid promo code';
    RETURN;
  END IF;
  
  -- Check if promo is applicable to this experience
  FOR applicable_promos IN
    SELECT * FROM get_applicable_promotions(
      exp_id, p_user_id, check_in_date, nights, guests, amount_cents
    )
    WHERE promotion_id = promo_record.id
  LOOP
    IF applicable_promos.is_eligible THEN
      RETURN QUERY SELECT 
        true,
        applicable_promos.promotion_id,
        applicable_promos.estimated_discount_cents,
        amount_cents - applicable_promos.estimated_discount_cents,
        NULL::TEXT;
    ELSE
      RETURN QUERY SELECT 
        false,
        applicable_promos.promotion_id,
        NULL::INT,
        NULL::INT,
        applicable_promos.eligibility_reason;
    END IF;
    RETURN;
  END LOOP;
  
  -- Promo exists but not applicable to this experience
  RETURN QUERY SELECT false, promo_record.id, NULL::INT, NULL::INT, 
                      'Promo code not valid for this experience';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION experience_active_promos IS 'Get summary of active promotions for an experience (lightweight for search)';
COMMENT ON FUNCTION get_applicable_promotions IS 'Get detailed list of applicable promotions with eligibility status';
COMMENT ON FUNCTION validate_promo_code IS 'Validate a promo code and calculate discount';
