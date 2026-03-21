-- Chat and Notification tables

-- Chat threads
CREATE TABLE chats_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants (JSONB array of profile IDs for group chats)
  participants UUID[] NOT NULL,
  
  -- Type
  is_group BOOLEAN DEFAULT FALSE,
  thread_name TEXT,
  
  -- Context (optional link to experience/booking)
  experience_id UUID REFERENCES experiences(id),
  booking_id UUID REFERENCES bookings(id),
  
  -- Last Message (denormalized for performance)
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMPTZ
);

-- Chat messages
CREATE TABLE chats_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Thread
  thread_id UUID NOT NULL REFERENCES chats_threads(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Content
  text TEXT,
  
  -- Attachments
  media_ids UUID[],
  
  -- Entity References (share experience/booking)
  experience_id UUID REFERENCES experiences(id),
  booking_id UUID REFERENCES bookings(id),
  
  -- Status
  read_by UUID[],
  delivered_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Type & Content
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  
  -- Entity Reference
  entity_type TEXT,
  entity_id UUID,
  
  -- Action URL (deep link)
  action_url TEXT,
  
  -- Status
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Push Notification
  push_sent_at TIMESTAMPTZ,
  push_token TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Triggers
CREATE TRIGGER trg_chats_threads_updated_at
  BEFORE UPDATE ON chats_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chats_messages_updated_at
  BEFORE UPDATE ON chats_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

