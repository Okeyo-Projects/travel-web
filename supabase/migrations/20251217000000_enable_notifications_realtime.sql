-- Enable real-time for notifications table
-- This allows Supabase to broadcast INSERT, UPDATE, and DELETE events to subscribed clients

-- Set replica identity to FULL to ensure all column values are included in real-time events
-- This is necessary for UPDATE and DELETE events to work properly
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Enable real-time publication for the notifications table
-- This makes the table available for real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create an index on user_id for better real-time filtering performance
-- This index may already exist, so we use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON notifications (user_id, created_at DESC);

-- Create an index for unread notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread
  ON notifications (user_id) WHERE read_at IS NULL;

-- Add a comment to document the real-time configuration
COMMENT ON TABLE notifications IS 'Notifications table with real-time enabled for instant notification delivery';
