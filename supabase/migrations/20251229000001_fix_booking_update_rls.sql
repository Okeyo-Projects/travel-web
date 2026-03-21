-- Fix booking update RLS for hosts
-- Hosts need to be able to update booking status (approve/decline)

CREATE POLICY bookings_host_update ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hosts h
      WHERE h.id = bookings.host_id AND h.owner_id = auth.uid()
    )
  );
