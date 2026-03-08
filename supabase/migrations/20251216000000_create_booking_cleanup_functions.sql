-- Migration: Create helper functions for experience availability
-- Purpose: Provide frontend validation for publishing experiences
-- Note: All cleanup logic is now handled by the Edge Function

-- ============================================================================
-- Function: Check if experience has future availability
-- ============================================================================
-- Checks if an experience (trip or activity) has any future departures/sessions
-- Used by frontend to prevent publishing without future dates
-- ============================================================================

CREATE OR REPLACE FUNCTION experience_has_future_availability(p_experience_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_experience_type experience_type;
  v_has_future BOOLEAN;
BEGIN
  -- Get experience type
  SELECT type INTO v_experience_type
  FROM experiences
  WHERE id = p_experience_id AND deleted_at IS NULL;

  -- If experience not found or is lodging, return true (lodging has continuous availability)
  IF v_experience_type IS NULL OR v_experience_type = 'lodging' THEN
    RETURN TRUE;
  END IF;

  -- For trips: check if there are any future departures
  IF v_experience_type = 'trip' THEN
    SELECT EXISTS(
      SELECT 1
      FROM trip_departures td
      WHERE td.experience_id = p_experience_id
        AND td.departure_date >= CURRENT_DATE
        AND td.deleted_at IS NULL
    ) INTO v_has_future;

    RETURN COALESCE(v_has_future, FALSE);
  END IF;

  -- For activities: check if there are any future sessions
  IF v_experience_type = 'activity' THEN
    SELECT EXISTS(
      SELECT 1
      FROM activity_sessions acs
      WHERE acs.experience_id = p_experience_id
        AND acs.start_time >= NOW()
        AND acs.deleted_at IS NULL
    ) INTO v_has_future;

    RETURN COALESCE(v_has_future, FALSE);
  END IF;

  -- Default to true for unknown types
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION experience_has_future_availability(UUID) IS
'Checks if an experience has any future departures (trips) or sessions (activities). Returns TRUE for lodging experiences.';

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

-- Allow authenticated users to check if experience has future availability
GRANT EXECUTE ON FUNCTION experience_has_future_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION experience_has_future_availability(UUID) TO anon;
