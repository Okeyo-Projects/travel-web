-- =====================================================
-- AUTO-INITIALIZE AVAILABILITY ON ROOM CREATION
-- =====================================================
-- This migration adds triggers to automatically initialize
-- availability calendar when room types are created

-- =====================================================
-- TRIGGER: Initialize availability for new room types
-- =====================================================

CREATE OR REPLACE FUNCTION auto_initialize_room_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_experience_id UUID;
  v_from_date DATE;
  v_to_date DATE;
BEGIN
  -- Get the experience_id from the room type
  v_experience_id := NEW.experience_id;

  -- Initialize availability for the next 2 years
  v_from_date := CURRENT_DATE;
  v_to_date := CURRENT_DATE + INTERVAL '2 years';

  -- Call the initialization function
  PERFORM initialize_lodging_availability(
    v_experience_id,
    NEW.id,
    v_from_date,
    v_to_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lodging_room_types insert
CREATE TRIGGER trigger_auto_initialize_room_availability
  AFTER INSERT ON lodging_room_types
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_room_availability();

-- =====================================================
-- TRIGGER: Initialize availability when experience published
-- =====================================================

CREATE OR REPLACE FUNCTION auto_initialize_experience_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_room_type RECORD;
  v_from_date DATE;
  v_to_date DATE;
BEGIN
  -- Only run if status changed to 'published' and experience has lodging
  IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.type = 'lodging' THEN

    -- Initialize availability for the next 2 years
    v_from_date := CURRENT_DATE;
    v_to_date := CURRENT_DATE + INTERVAL '2 years';

    -- Initialize for all room types of this experience
    FOR v_room_type IN
      SELECT id FROM lodging_room_types
      WHERE experience_id = NEW.id
      AND deleted_at IS NULL
    LOOP
      -- Call initialization (uses ON CONFLICT DO NOTHING internally)
      PERFORM initialize_lodging_availability(
        NEW.id,
        v_room_type.id,
        v_from_date,
        v_to_date
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on experiences update
CREATE TRIGGER trigger_auto_initialize_experience_availability
  AFTER UPDATE ON experiences
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.status != 'published')
  EXECUTE FUNCTION auto_initialize_experience_availability();

-- =====================================================
-- HELPER: Extend availability for existing experiences
-- =====================================================

CREATE OR REPLACE FUNCTION extend_availability_for_all_lodging()
RETURNS TABLE (
  experience_id UUID,
  room_type_id UUID,
  records_created INT
) AS $$
DECLARE
  v_experience RECORD;
  v_room_type RECORD;
  v_from_date DATE;
  v_to_date DATE;
  v_created INT;
BEGIN
  -- Get all published lodging experiences
  FOR v_experience IN
    SELECT id FROM experiences
    WHERE type = 'lodging'
    AND status = 'published'
  LOOP
    -- Get all room types for this experience
    FOR v_room_type IN
      SELECT id FROM lodging_room_types
      WHERE experience_id = v_experience.id
      AND deleted_at IS NULL
    LOOP
      -- Extend availability for next 2 years from today
      v_from_date := CURRENT_DATE;
      v_to_date := CURRENT_DATE + INTERVAL '2 years';

      -- Initialize (will skip existing dates due to ON CONFLICT)
      SELECT initialize_lodging_availability(
        v_experience.id,
        v_room_type.id,
        v_from_date,
        v_to_date
      ) INTO v_created;

      RETURN QUERY SELECT v_experience.id, v_room_type.id, v_created;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update availability when room total changes
-- =====================================================

CREATE OR REPLACE FUNCTION update_availability_on_room_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If total_rooms changed, update future availability records
  IF NEW.total_rooms != OLD.total_rooms THEN

    -- Update all future dates where rooms_available equals old total
    -- (meaning no reservations have been made)
    UPDATE lodging_availability
    SET
      rooms_total = NEW.total_rooms,
      rooms_available = NEW.total_rooms,
      updated_at = NOW()
    WHERE room_type_id = NEW.id
      AND date >= CURRENT_DATE
      AND rooms_available = OLD.total_rooms;

    -- For dates with reservations, just update the total
    UPDATE lodging_availability
    SET
      rooms_total = NEW.total_rooms,
      updated_at = NOW()
    WHERE room_type_id = NEW.id
      AND date >= CURRENT_DATE
      AND rooms_available != OLD.total_rooms;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lodging_room_types update
CREATE TRIGGER trigger_update_availability_on_room_change
  AFTER UPDATE ON lodging_room_types
  FOR EACH ROW
  WHEN (NEW.total_rooms IS DISTINCT FROM OLD.total_rooms)
  EXECUTE FUNCTION update_availability_on_room_change();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_initialize_room_availability IS
  'Automatically initializes availability for 2 years when a new room type is created';

COMMENT ON FUNCTION auto_initialize_experience_availability IS
  'Automatically initializes availability for all room types when experience is published';

COMMENT ON FUNCTION extend_availability_for_all_lodging IS
  'One-time helper to initialize availability for all existing lodging experiences';

COMMENT ON FUNCTION update_availability_on_room_change IS
  'Updates availability records when room total changes';

-- =====================================================
-- INITIALIZE EXISTING EXPERIENCES (RUN ONCE)
-- =====================================================

-- Uncomment to initialize all existing lodging experiences:
-- SELECT * FROM extend_availability_for_all_lodging();
