-- Add is_featured flag and followers_count to hosts table
ALTER TABLE hosts 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;

-- Create index for featured hosts
CREATE INDEX IF NOT EXISTS idx_hosts_featured ON hosts(is_featured) WHERE is_featured = TRUE AND deleted_at IS NULL;

-- Function to update host followers count
CREATE OR REPLACE FUNCTION update_host_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.following_type = 'host' THEN
    UPDATE hosts
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' AND OLD.following_type = 'host' THEN
    UPDATE hosts
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain followers_count
DROP TRIGGER IF EXISTS trg_update_host_followers_count ON follows;
CREATE TRIGGER trg_update_host_followers_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION update_host_followers_count();

-- Initialize followers_count for existing hosts
UPDATE hosts
SET followers_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.following_type = 'host'
    AND follows.following_id = hosts.id
)
WHERE followers_count = 0;

COMMENT ON COLUMN hosts.is_featured IS 'Whether this host should appear in featured section';
COMMENT ON COLUMN hosts.followers_count IS 'Denormalized count of followers for performance';

