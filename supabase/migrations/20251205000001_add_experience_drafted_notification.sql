-- Add experience_drafted notification type for auto-drafted experiences
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'experience_drafted';
