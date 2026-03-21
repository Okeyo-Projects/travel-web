-- =====================================================
-- BULK CREATION HELPERS FOR TRIPS & ACTIVITIES
-- =====================================================
-- Helper functions to make it easier for hosts to create
-- multiple departures or recurring sessions

-- =====================================================
-- BULK CREATE TRIP DEPARTURES
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_create_trip_departures(
  p_experience_id UUID,
  p_start_date DATE,
  p_trip_duration_days INT,
  p_frequency_days INT,  -- e.g., 7 for weekly, 14 for bi-weekly
  p_num_departures INT,
  p_seats_total INT,
  p_guide_id UUID DEFAULT NULL
)
RETURNS TABLE (
  departure_id UUID,
  depart_at TIMESTAMPTZ,
  return_at TIMESTAMPTZ
) AS $$
DECLARE
  v_depart_date DATE;
  v_return_date DATE;
  v_created_id UUID;
  v_counter INT := 0;
BEGIN
  -- Create multiple departures based on frequency
  FOR v_counter IN 0..(p_num_departures - 1)
  LOOP
    v_depart_date := p_start_date + (v_counter * p_frequency_days);
    v_return_date := v_depart_date + p_trip_duration_days;

    -- Insert departure
    INSERT INTO trip_departures (
      experience_id,
      depart_at,
      return_at,
      seats_total,
      seats_available,
      guide_id,
      status
    ) VALUES (
      p_experience_id,
      v_depart_date::TIMESTAMPTZ,
      v_return_date::TIMESTAMPTZ,
      p_seats_total,
      p_seats_total,
      p_guide_id,
      'scheduled'
    )
    RETURNING id INTO v_created_id;

    RETURN QUERY SELECT
      v_created_id,
      v_depart_date::TIMESTAMPTZ,
      v_return_date::TIMESTAMPTZ;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BULK CREATE ACTIVITY SESSIONS (RECURRING)
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_create_activity_sessions(
  p_experience_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_days_of_week INT[],  -- Array: 0=Sunday, 1=Monday, ... 6=Saturday
  p_session_time TIME,
  p_duration_minutes INT,
  p_capacity_total INT
)
RETURNS TABLE (
  session_id UUID,
  start_at TIMESTAMPTZ
) AS $$
DECLARE
  v_current_date DATE;
  v_day_of_week INT;
  v_session_start TIMESTAMPTZ;
  v_session_end TIMESTAMPTZ;
  v_created_id UUID;
BEGIN
  -- Loop through each date in range
  v_current_date := p_start_date;

  WHILE v_current_date <= p_end_date LOOP
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);

    -- Check if this day is in the specified days
    IF v_day_of_week = ANY(p_days_of_week) THEN
      -- Create session
      v_session_start := v_current_date::TIMESTAMPTZ + p_session_time;
      v_session_end := v_session_start + (p_duration_minutes || ' minutes')::INTERVAL;

      INSERT INTO activity_sessions (
        experience_id,
        start_at,
        end_at,
        capacity_total,
        capacity_available,
        status
      ) VALUES (
        p_experience_id,
        v_session_start,
        v_session_end,
        p_capacity_total,
        p_capacity_total,
        'scheduled'
      )
      ON CONFLICT (experience_id, start_at) DO NOTHING
      RETURNING id INTO v_created_id;

      IF FOUND THEN
        RETURN QUERY SELECT v_created_id, v_session_start;
      END IF;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DUPLICATE DEPARTURE (COPY SETTINGS)
-- =====================================================

CREATE OR REPLACE FUNCTION duplicate_trip_departure(
  p_departure_id UUID,
  p_new_depart_at TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_departure RECORD;
  v_new_id UUID;
  v_duration INTERVAL;
BEGIN
  -- Get existing departure
  SELECT * INTO v_departure
  FROM trip_departures
  WHERE id = p_departure_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found: %', p_departure_id;
  END IF;

  -- Calculate duration
  v_duration := v_departure.return_at - v_departure.depart_at;

  -- Create duplicate with new dates
  INSERT INTO trip_departures (
    experience_id,
    depart_at,
    return_at,
    seats_total,
    seats_available,
    status,
    price_override_cents,
    guide_id,
    guide_notes
  ) VALUES (
    v_departure.experience_id,
    p_new_depart_at,
    p_new_depart_at + v_duration,
    v_departure.seats_total,
    v_departure.seats_total,  -- Reset to full availability
    'scheduled',
    v_departure.price_override_cents,
    v_departure.guide_id,
    v_departure.guide_notes
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXAMPLES / USAGE
-- =====================================================

COMMENT ON FUNCTION bulk_create_trip_departures IS
  'Create multiple trip departures at regular intervals. Example:
   SELECT * FROM bulk_create_trip_departures(
     experience_id := ''safari-uuid'',
     start_date := ''2026-01-01'',
     trip_duration_days := 7,
     frequency_days := 7,      -- Weekly departures
     num_departures := 52,     -- Create 52 weeks worth
     seats_total := 20
   );';

COMMENT ON FUNCTION bulk_create_activity_sessions IS
  'Create recurring activity sessions. Example:
   SELECT * FROM bulk_create_activity_sessions(
     experience_id := ''yoga-uuid'',
     start_date := ''2026-01-01'',
     end_date := ''2026-12-31'',
     days_of_week := ARRAY[1,3,5],  -- Monday, Wednesday, Friday
     session_time := ''08:00:00'',
     duration_minutes := 60,
     capacity_total := 15
   );';

COMMENT ON FUNCTION duplicate_trip_departure IS
  'Duplicate an existing departure with new date. Example:
   SELECT duplicate_trip_departure(
     ''existing-departure-uuid'',
     ''2026-02-01 09:00:00''
   );';
