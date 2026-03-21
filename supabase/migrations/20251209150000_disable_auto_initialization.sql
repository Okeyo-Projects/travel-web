-- =====================================================
-- DISABLE AUTO-INITIALIZATION TRIGGERS
-- =====================================================
-- Temporarily disable auto-initialization to fix room creation issues
-- Hosts can manually initialize availability when needed

-- Drop all auto-initialization triggers
DROP TRIGGER IF EXISTS trigger_auto_initialize_room_availability ON lodging_room_types;
DROP TRIGGER IF EXISTS trigger_auto_initialize_experience_availability ON experiences;
DROP TRIGGER IF EXISTS trigger_update_availability_on_room_change ON lodging_room_types;

-- Drop the trigger functions (keep the helper functions for manual use)
DROP FUNCTION IF EXISTS auto_initialize_room_availability();
DROP FUNCTION IF EXISTS auto_initialize_experience_availability();
DROP FUNCTION IF EXISTS update_availability_on_room_change();

-- =====================================================
-- NOTE: The following functions are still available for manual use:
-- - initialize_lodging_availability() - manually initialize availability
-- - extend_availability_for_all_lodging() - bulk initialize all lodging
-- =====================================================

COMMENT ON FUNCTION initialize_lodging_availability IS
  'Manually create availability records for a room type across a date range';

COMMENT ON FUNCTION extend_availability_for_all_lodging IS
  'Bulk initialize availability for all existing lodging experiences (manual use only)';
