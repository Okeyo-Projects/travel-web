-- Extend booking workflow statuses and metadata
-- Note: PostgreSQL requires enum values to be added in separate transactions
-- We cannot use them immediately in the same migration

-- Add new enum values
DO $$
BEGIN
  -- Add pending_host if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_host'
    AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'pending_host';
  END IF;
END $$;

DO $$
BEGIN
  -- Add approved if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'approved'
    AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'approved';
  END IF;
END $$;

DO $$
BEGIN
  -- Add declined if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'declined'
    AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'declined';
  END IF;
END $$;

-- Add new columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS host_response_template TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
