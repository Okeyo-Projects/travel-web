-- Create functions to maintain host stats (total_experiences, avg_rating)

-- ===========================================
-- UPDATE HOST TOTAL EXPERIENCES
-- ===========================================

-- Function to update host's total_experiences count
CREATE OR REPLACE FUNCTION update_host_total_experiences()
RETURNS TRIGGER AS $$
BEGIN
  -- When experience is published for first time
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status != 'published') THEN
    UPDATE hosts
    SET total_experiences = (
      SELECT COUNT(*)
      FROM experiences
      WHERE host_id = NEW.host_id
        AND status = 'published'
        AND deleted_at IS NULL
    )
    WHERE id = NEW.host_id;

  -- When experience is unpublished or deleted
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status != 'published') OR
        (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR
        (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
    UPDATE hosts
    SET total_experiences = (
      SELECT COUNT(*)
      FROM experiences
      WHERE host_id = COALESCE(NEW.host_id, OLD.host_id)
        AND status = 'published'
        AND deleted_at IS NULL
    )
    WHERE id = COALESCE(NEW.host_id, OLD.host_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_host_total_experiences ON experiences;

-- Create trigger for host total_experiences
CREATE TRIGGER trg_update_host_total_experiences
  AFTER INSERT OR UPDATE OR DELETE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_host_total_experiences();

-- ===========================================
-- UPDATE HOST AVERAGE RATING
-- ===========================================

-- Function to update host's avg_rating based on all their experiences
CREATE OR REPLACE FUNCTION update_host_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the host's average rating based on all their experiences
  UPDATE hosts
  SET avg_rating = (
    SELECT AVG(avg_rating)::NUMERIC(3,2)
    FROM experiences
    WHERE host_id = COALESCE(NEW.host_id, OLD.host_id)
      AND status = 'published'
      AND deleted_at IS NULL
      AND avg_rating IS NOT NULL
  )
  WHERE id = COALESCE(NEW.host_id, OLD.host_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_host_avg_rating ON experiences;

-- Create trigger for host avg_rating when experience rating changes
CREATE TRIGGER trg_update_host_avg_rating
  AFTER INSERT OR UPDATE OF avg_rating OR DELETE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_host_avg_rating();

-- ===========================================
-- INITIALIZE EXISTING HOST STATS
-- ===========================================

-- Update all existing hosts' total_experiences
UPDATE hosts
SET total_experiences = (
  SELECT COUNT(*)
  FROM experiences
  WHERE experiences.host_id = hosts.id
    AND experiences.status = 'published'
    AND experiences.deleted_at IS NULL
);

-- Update all existing hosts' avg_rating
UPDATE hosts
SET avg_rating = (
  SELECT AVG(avg_rating)::NUMERIC(3,2)
  FROM experiences
  WHERE experiences.host_id = hosts.id
    AND experiences.status = 'published'
    AND experiences.deleted_at IS NULL
    AND experiences.avg_rating IS NOT NULL
);

-- Add comments
COMMENT ON FUNCTION update_host_total_experiences() IS 'Maintains denormalized total_experiences count on hosts table';
COMMENT ON FUNCTION update_host_avg_rating() IS 'Maintains denormalized avg_rating on hosts table based on experience ratings';
