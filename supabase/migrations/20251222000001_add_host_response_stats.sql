-- Add host response stats tracking

-- Function to update host response stats (rate and time)
CREATE OR REPLACE FUNCTION update_host_response_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_host_id UUID;
  v_total_inquiries INT;
  v_responded_count INT;
  v_avg_response_time NUMERIC;
BEGIN
  v_host_id := NEW.host_id;

  -- Calculate Response Rate
  -- Total inquiries: All bookings that are not drafts (i.e., user actually sent them)
  SELECT COUNT(*)
  INTO v_total_inquiries
  FROM bookings
  WHERE host_id = v_host_id
    AND status != 'draft'
    AND deleted_at IS NULL;

  -- Responded count: Confirmed or Declined
  SELECT COUNT(*)
  INTO v_responded_count
  FROM bookings
  WHERE host_id = v_host_id
    AND status IN ('confirmed', 'declined')
    AND deleted_at IS NULL;

  -- Calculate Response Time (in hours)
  -- Average time between created_at and updated_at for responded bookings
  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)
  INTO v_avg_response_time
  FROM bookings
  WHERE host_id = v_host_id
    AND status IN ('confirmed', 'declined')
    AND deleted_at IS NULL;

  -- Update Host Stats
  UPDATE hosts
  SET 
    response_rate = CASE 
      WHEN v_total_inquiries > 0 THEN ROUND((v_responded_count::NUMERIC / v_total_inquiries::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    response_time_hours = ROUND(COALESCE(v_avg_response_time, 0))
  WHERE id = v_host_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats when booking status changes
DROP TRIGGER IF EXISTS trg_update_host_response_stats ON bookings;

CREATE TRIGGER trg_update_host_response_stats
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (
  OLD.status = 'pending_host' AND 
  NEW.status IN ('confirmed', 'declined')
)
EXECUTE FUNCTION update_host_response_stats();

-- Also trigger on INSERT if a booking is created directly as confirmed/declined (rare but possible in admin tools)
CREATE TRIGGER trg_update_host_response_stats_insert
AFTER INSERT ON bookings
FOR EACH ROW
WHEN (
  NEW.status IN ('confirmed', 'declined')
)
EXECUTE FUNCTION update_host_response_stats();
