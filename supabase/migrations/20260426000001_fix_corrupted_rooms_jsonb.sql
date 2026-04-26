-- Fix bookings where `rooms` was stored as a JSONB string scalar
-- instead of a JSONB array (caused by JSON.stringify double-encoding in edge function).
-- `rooms #>> '{}'` extracts the raw text of the scalar string, then re-parses it as JSONB.
UPDATE bookings
SET rooms = (rooms #>> '{}')::jsonb
WHERE rooms IS NOT NULL
  AND jsonb_typeof(rooms) = 'string';
