-- Add new notification types to the enum
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'payment_deadline';
