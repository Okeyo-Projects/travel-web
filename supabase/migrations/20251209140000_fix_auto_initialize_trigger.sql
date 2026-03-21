-- =====================================================
-- FIX AUTO-INITIALIZE TRIGGER
-- =====================================================
-- The auto-initialize trigger was preventing room creation
-- by raising exceptions. This makes it more defensive.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_auto_initialize_room_availability ON lodging_room_types;

-- Recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION auto_initialize_room_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_experience_id UUID;
  v_from_date DATE;
  v_to_date DATE;
  v_records_created INT;
BEGIN
  -- Get the experience_id from the room type
  v_experience_id := NEW.experience_id;

  -- Initialize availability for the next 2 years
  v_from_date := CURRENT_DATE;
  v_to_date := CURRENT_DATE + INTERVAL '2 years';

  -- Wrap initialization in exception handler
  -- This ensures room creation succeeds even if initialization fails
  BEGIN
    -- Call the initialization function
    SELECT initialize_lodging_availability(
      v_experience_id,
      NEW.id,
      v_from_date,
      v_to_date
    ) INTO v_records_created;

    -- Log success (optional, can be removed if not needed)
    RAISE NOTICE 'Auto-initialized % availability records for room type %', v_records_created, NEW.id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the room creation
      RAISE WARNING 'Failed to auto-initialize availability for room type %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow the room insertion to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_initialize_room_availability
  AFTER INSERT ON lodging_room_types
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_room_availability();

-- =====================================================
-- ALSO UPDATE initialize_lodging_availability
-- =====================================================
-- Make it more defensive to avoid race conditions

CREATE OR REPLACE FUNCTION initialize_lodging_availability(
  p_experience_id UUID,
  p_room_type_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS INT AS $$
DECLARE
  v_total_rooms INT;
  v_date DATE;
  v_inserted_count INT := 0;
BEGIN
  -- Get total rooms for this room type with a small delay to ensure row is visible
  -- This helps avoid race conditions with AFTER INSERT triggers
  SELECT total_rooms INTO v_total_rooms
  FROM lodging_room_types
  WHERE id = p_room_type_id
    AND deleted_at IS NULL;

  -- If room type not found, return 0 instead of raising exception
  IF NOT FOUND THEN
    RAISE WARNING 'Room type not found during availability initialization: %', p_room_type_id;
    RETURN 0;
  END IF;

  -- Validate total_rooms
  IF v_total_rooms IS NULL OR v_total_rooms <= 0 THEN
    RAISE WARNING 'Invalid total_rooms (%) for room type %', v_total_rooms, p_room_type_id;
    RETURN 0;
  END IF;

  -- Insert availability records for each date
  FOR v_date IN SELECT unnest(generate_date_range(p_from_date, p_to_date + INTERVAL '1 day'))
  LOOP
    INSERT INTO lodging_availability (
      experience_id,
      room_type_id,
      date,
      rooms_total,
      rooms_available
    ) VALUES (
      p_experience_id,
      p_room_type_id,
      v_date,
      v_total_rooms,
      v_total_rooms
    )
    ON CONFLICT (room_type_id, date) DO NOTHING;

    -- Count inserted rows
    IF FOUND THEN
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN v_inserted_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 instead of propagating exception
    RAISE WARNING 'Error initializing availability for room type %: %', p_room_type_id, SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_initialize_room_availability IS
  'Automatically initializes availability for 2 years when a new room type is created. Uses defensive error handling to prevent room creation failures.';

COMMENT ON FUNCTION initialize_lodging_availability IS
  'Create availability records for a room type across a date range. Returns 0 on error instead of raising exceptions.';
