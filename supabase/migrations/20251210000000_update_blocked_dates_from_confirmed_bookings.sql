-- =====================================================
-- UPDATE: Blocked Dates from Confirmed Bookings Only
-- =====================================================
-- Per AVAILABILITY_REMOVAL_COMPLETE.md, unavailability dates
-- should be calculated from confirmed bookings only, not from
-- pending or other statuses.
-- =====================================================

-- =====================================================
-- UPDATE: Calculate booked rooms from confirmed bookings only
-- =====================================================

CREATE OR REPLACE FUNCTION get_booked_rooms_count(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
  SELECT COALESCE(SUM((room->>'quantity')::INT), 0)::INT
  FROM bookings b,
       jsonb_array_elements(b.rooms) AS room
  WHERE b.from_date <= p_date
    AND b.to_date > p_date
    AND b.status = 'confirmed'  -- Only count confirmed bookings
    AND b.rooms IS NOT NULL
    AND (room->>'room_type_id')::UUID = p_room_type_id;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- UPDATE: Index for confirmed bookings only
-- =====================================================

-- Update index to optimize queries for confirmed bookings
DROP INDEX IF EXISTS idx_bookings_dates_status;

CREATE INDEX IF NOT EXISTS idx_bookings_dates_status_confirmed
  ON bookings(from_date, to_date, status)
  WHERE status = 'confirmed';

-- Keep the GIN index for rooms JSONB
CREATE INDEX IF NOT EXISTS idx_bookings_rooms_gin
  ON bookings USING gin(rooms);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_booked_rooms_count IS
  'Calculate how many rooms of a specific type are booked on a given date from confirmed bookings only';

