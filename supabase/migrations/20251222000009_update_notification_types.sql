-- Add new values to notification_kind enum to match app types
-- We use IF NOT EXISTS to avoid errors if re-running, though standard postgres doesn't support IF NOT EXISTS for ADD VALUE in all versions, 
-- Supabase/Postgres 12+ supports it.

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'booking_created';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'booking_paid';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'booking_approved';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'booking_declined';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'booking_reminder';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'like_experience';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'share_experience';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'report_experience';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'comment_experience';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'reply_to_comment';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'new_comment';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'review_received';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'review_request';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'new_follow';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'payment_failed';

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'like_reel';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'save_reel';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'report_reel';
