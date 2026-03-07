-- =====================================================
-- GET BLOCKED DATES FOR CALENDAR
-- =====================================================
-- This migration adds a function to fetch all blocked dates
-- for a lodging experience in a given date range, so the
-- calendar can gray out unavailable dates

CREATE OR REPLACE FUNCTION get_lodging_blocked_dates(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
)
RETURNS TABLE (blocked_date DATE) AS $$
DECLARE
  v_current_date DATE;
  v_date_count INT;
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_available INT;
BEGIN
  -- Loop through each date in the range
  v_current_date := p_from_date;

  WHILE v_current_date < p_to_date LOOP
    v_date_count := 0;

    -- Check each room type
    FOR v_room IN SELECT * FROM jsonb_array_elements(p_rooms)
    LOOP
      v_room_type_id := (v_room->>'room_type_id')::UUID;
      v_quantity := (v_room->>'quantity')::INT;

      -- Get available count for this room type on this date
      SELECT get_available_rooms(v_room_type_id, v_current_date)
      INTO v_available;

      -- If any room type doesn't have enough availability, date is blocked
      IF v_available < v_quantity THEN
        RETURN QUERY SELECT v_current_date;
        EXIT; -- No need to check other rooms for this date
      END IF;
    END LOOP;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_lodging_blocked_dates IS
  'Returns a list of blocked dates where the requested rooms are not available';
