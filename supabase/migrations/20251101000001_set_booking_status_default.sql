-- Set default value for booking status
-- This must be in a separate migration because PostgreSQL requires
-- enum values to be committed before they can be used

ALTER TABLE bookings
  ALTER COLUMN status SET DEFAULT 'pending_host';
