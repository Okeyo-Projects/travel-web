-- Add missing notification types to notification_kind enum

DO $$
BEGIN
  -- Comments
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'comment' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'comment';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'comment_reply' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'comment_reply';
  END IF;

  -- Booking updates
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'booking_approved' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'booking_approved';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'booking_declined' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'booking_declined';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'booking_reminder' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'booking_reminder';
  END IF;

  -- System/Other
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'review_request' AND enumtypid = 'notification_kind'::regtype) THEN
    ALTER TYPE notification_kind ADD VALUE 'review_request';
  END IF;
END $$;
