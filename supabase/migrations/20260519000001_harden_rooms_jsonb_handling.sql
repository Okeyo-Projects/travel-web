-- Repair corrupted room payloads and harden lodging availability helpers
-- against legacy JSONB string scalars such as:
--   "\"[{\\\"room_type_id\\\":\\\"...\\\",\\\"quantity\\\":1}]\""

CREATE OR REPLACE FUNCTION normalize_booking_rooms_jsonb(p_rooms JSONB)
RETURNS JSONB AS $$
DECLARE
  v_rooms JSONB;
BEGIN
  IF p_rooms IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_rooms) = 'string' THEN
    BEGIN
      v_rooms := (p_rooms #>> '{}')::JSONB;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;

    RETURN v_rooms;
  END IF;

  RETURN p_rooms;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE bookings
SET rooms = normalize_booking_rooms_jsonb(rooms)
WHERE rooms IS NOT NULL
  AND jsonb_typeof(rooms) = 'string';

UPDATE booking_items
SET rooms = normalize_booking_rooms_jsonb(rooms)
WHERE rooms IS NOT NULL
  AND jsonb_typeof(rooms) = 'string';

CREATE OR REPLACE FUNCTION get_booked_rooms_count(
  p_room_type_id UUID,
  p_date DATE
) RETURNS INT AS $$
  WITH normalized_bookings AS (
    SELECT normalize_booking_rooms_jsonb(b.rooms) AS rooms
    FROM bookings b
    WHERE b.from_date <= p_date
      AND b.to_date > p_date
      AND b.status = 'confirmed'
      AND b.rooms IS NOT NULL
  )
  SELECT COALESCE(SUM((room->>'quantity')::INT), 0)::INT
  FROM normalized_bookings nb
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN nb.rooms IS NOT NULL AND jsonb_typeof(nb.rooms) = 'array' THEN nb.rooms
      ELSE '[]'::JSONB
    END
  ) AS room
  WHERE (room->>'room_type_id')::UUID = p_room_type_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION check_lodging_availability(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS TABLE (
  available BOOLEAN,
  message TEXT,
  unavailable_dates DATE[],
  room_conflicts JSONB
) AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
  v_total_rooms INT;
  v_booked_count INT;
  v_available_count INT;
  v_all_available BOOLEAN := TRUE;
  v_rooms JSONB := normalize_booking_rooms_jsonb(p_rooms);
  v_unavailable_dates DATE[] := ARRAY[]::DATE[];
  v_conflicts JSONB := '[]'::JSONB;
BEGIN
  IF p_from_date >= p_to_date THEN
    RETURN QUERY SELECT FALSE, 'Invalid date range: to_date must be after from_date'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  IF v_rooms IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No rooms specified'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  IF jsonb_typeof(v_rooms) != 'array' THEN
    RETURN QUERY SELECT FALSE, 'Invalid rooms payload: expected a JSON array'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  IF jsonb_array_length(v_rooms) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No rooms specified'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
    RETURN;
  END IF;

  FOR v_room IN SELECT * FROM jsonb_array_elements(v_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    SELECT total_rooms INTO v_total_rooms
    FROM lodging_room_types
    WHERE id = v_room_type_id
      AND experience_id = p_experience_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE,
                          format('Room type %s not found', v_room_type_id)::TEXT,
                          ARRAY[]::DATE[],
                          '[]'::JSONB;
      RETURN;
    END IF;

    FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date))
    LOOP
      v_booked_count := get_booked_rooms_count(v_room_type_id, v_date);
      v_available_count := v_total_rooms - v_booked_count;

      IF v_available_count < v_quantity THEN
        v_all_available := FALSE;
        v_unavailable_dates := array_append(v_unavailable_dates, v_date);

        v_conflicts := v_conflicts || jsonb_build_object(
          'room_type_id', v_room_type_id,
          'date', v_date,
          'requested', v_quantity,
          'available', v_available_count,
          'total', v_total_rooms,
          'booked', v_booked_count
        );
      END IF;
    END LOOP;
  END LOOP;

  IF v_all_available THEN
    RETURN QUERY SELECT TRUE, 'All rooms available'::TEXT,
                        ARRAY[]::DATE[], '[]'::JSONB;
  ELSE
    RETURN QUERY SELECT FALSE,
                        format('Insufficient availability for %s dates', array_length(v_unavailable_dates, 1))::TEXT,
                        v_unavailable_dates,
                        v_conflicts;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_lodging_blocked_dates(
  p_experience_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_rooms JSONB
) RETURNS TABLE (blocked_date DATE) AS $$
DECLARE
  v_room JSONB;
  v_room_type_id UUID;
  v_quantity INT;
  v_date DATE;
  v_total_rooms INT;
  v_booked_count INT;
  v_available_count INT;
  v_rooms JSONB := normalize_booking_rooms_jsonb(p_rooms);
  v_blocked_dates DATE[] := ARRAY[]::DATE[];
BEGIN
  IF v_rooms IS NULL OR jsonb_typeof(v_rooms) != 'array' OR jsonb_array_length(v_rooms) = 0 THEN
    RETURN;
  END IF;

  FOR v_room IN SELECT * FROM jsonb_array_elements(v_rooms)
  LOOP
    v_room_type_id := (v_room->>'room_type_id')::UUID;
    v_quantity := (v_room->>'quantity')::INT;

    SELECT total_rooms INTO v_total_rooms
    FROM lodging_room_types
    WHERE id = v_room_type_id
      AND experience_id = p_experience_id
      AND deleted_at IS NULL;

    IF FOUND AND v_total_rooms > 0 THEN
      FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date + INTERVAL '1 day'))
      LOOP
        v_booked_count := get_booked_rooms_count(v_room_type_id, v_date);
        v_available_count := v_total_rooms - v_booked_count;

        IF v_available_count < v_quantity AND NOT (v_date = ANY(v_blocked_dates)) THEN
          v_blocked_dates := array_append(v_blocked_dates, v_date);
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN QUERY SELECT unnest(v_blocked_dates) AS blocked_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION normalize_booking_rooms_jsonb IS
  'Normalize booking rooms JSONB values by converting legacy string scalars back into JSON arrays.';
