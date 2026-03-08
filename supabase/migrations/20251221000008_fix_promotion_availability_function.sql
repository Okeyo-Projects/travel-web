-- =====================================================
-- FIX: is_promotion_available function - missing 'unlimited' case
-- =====================================================
-- This migration fixes the "case not found" error by adding
-- proper handling for 'unlimited' usage_limit_type and improving
-- experience type checking.
-- =====================================================

CREATE OR REPLACE FUNCTION is_promotion_available(
  p_promotion_id UUID,
  p_user_id UUID,
  p_booking_amount_cents INT,
  p_experience_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promotion RECORD;
  v_user_usage_count INT;
  v_user_bookings_count INT;
  v_experience_type TEXT;
BEGIN
  -- Get promotion details
  SELECT * INTO v_promotion
  FROM promotions
  WHERE id = p_promotion_id
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > NOW())
    AND valid_from <= NOW();
  
  -- Promotion doesn't exist or is inactive
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check minimum booking amount
  IF v_promotion.min_booking_amount_cents IS NOT NULL 
     AND p_booking_amount_cents < v_promotion.min_booking_amount_cents THEN
    RETURN FALSE;
  END IF;
  
  -- Check experience type eligibility (if promotion is limited to specific types)
  IF v_promotion.applicable_experience_types IS NOT NULL 
     AND array_length(v_promotion.applicable_experience_types, 1) > 0
     AND p_experience_id IS NOT NULL THEN
    -- Get experience type
    SELECT e.type::TEXT INTO v_experience_type
    FROM experiences e
    WHERE e.id = p_experience_id;
    
    -- If experience type doesn't match, promotion is not available
    IF v_experience_type IS NOT NULL 
       AND NOT (v_experience_type = ANY(v_promotion.applicable_experience_types)) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check experience ID eligibility (if promotion is limited to specific experiences)
  IF v_promotion.applicable_experience_ids IS NOT NULL 
     AND p_experience_id IS NOT NULL
     AND NOT (p_experience_id = ANY(v_promotion.applicable_experience_ids)) THEN
    RETURN FALSE;
  END IF;
  
  -- Check usage limits - FIX: Add 'unlimited' case
  CASE v_promotion.usage_limit_type
    WHEN 'unlimited' THEN
      -- No limit check needed, continue to next checks
      NULL;
    
    WHEN 'once_total' THEN
      IF v_promotion.current_total_usage >= 1 THEN
        RETURN FALSE;
      END IF;
    
    WHEN 'limited_total' THEN
      IF v_promotion.current_total_usage >= COALESCE(v_promotion.total_usage_limit, 0) THEN
        RETURN FALSE;
      END IF;
    
    WHEN 'once_per_user' THEN
      SELECT COUNT(*) INTO v_user_usage_count
      FROM promotion_usages
      WHERE promotion_id = p_promotion_id
        AND user_id = p_user_id
        AND status = 'applied';
      
      IF v_user_usage_count >= 1 THEN
        RETURN FALSE;
      END IF;
    
    WHEN 'limited_per_user' THEN
      SELECT COUNT(*) INTO v_user_usage_count
      FROM promotion_usages
      WHERE promotion_id = p_promotion_id
        AND user_id = p_user_id
        AND status = 'applied';
      
      IF v_user_usage_count >= COALESCE(v_promotion.per_user_usage_limit, 0) THEN
        RETURN FALSE;
      END IF;
    
    ELSE
      -- Unknown usage limit type - be safe and return false
      RETURN FALSE;
  END CASE;
  
  -- Check first booking only restriction
  IF v_promotion.first_booking_only THEN
    SELECT COALESCE(total_bookings_count, 0) INTO v_user_bookings_count
    FROM user_promotion_eligibility
    WHERE user_id = p_user_id;
    
    -- If user has completed bookings and promotion is first-booking-only, not available
    IF v_user_bookings_count > 0 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION is_promotion_available(UUID, UUID, INT, UUID) IS
  'Check if a promotion is available for a user and booking. Handles all usage_limit_type cases including unlimited.';

