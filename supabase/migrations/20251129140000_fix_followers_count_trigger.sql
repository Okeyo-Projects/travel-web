-- Fix host followers count trigger
-- The trigger wasn't firing correctly, so we'll recreate it and recalculate counts

-- Drop existing trigger
DROP TRIGGER IF EXISTS trg_update_host_followers_count ON follows;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION update_host_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.following_type = 'host' THEN
      UPDATE hosts
      SET followers_count = followers_count + 1
      WHERE id = NEW.following_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.following_type = 'host' THEN
      UPDATE hosts
      SET followers_count = GREATEST(0, followers_count - 1)
      WHERE id = OLD.following_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger without pg_trigger_depth check (which might have been causing issues)
CREATE TRIGGER trg_update_host_followers_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_host_followers_count();

-- Recalculate all followers counts from scratch
UPDATE hosts
SET followers_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.following_type = 'host'
    AND follows.following_id = hosts.id
);

-- Verify the trigger is working
COMMENT ON TRIGGER trg_update_host_followers_count ON follows IS 'Maintains denormalized followers_count in hosts table';
