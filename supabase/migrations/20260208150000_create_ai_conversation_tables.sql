-- AI Conversation tables (separate from user-to-user chat)

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (nullable for anonymous users)
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- For anonymous users, store a client-generated ID
  client_id TEXT,

  -- Conversation metadata
  title TEXT, -- Auto-generated from first message (first 60 chars)
  first_message TEXT, -- For sidebar preview (200 chars max)

  -- User context at conversation start
  user_location JSONB, -- {lat, lng, timestamp}

  -- Status
  archived_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AI Messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

  -- Message data (matches AI SDK format)
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT, -- Text content
  parts JSONB, -- AI SDK parts array for tool calls, UI blocks, etc.

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_client_id ON ai_conversations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own conversations
DROP POLICY IF EXISTS "Users can read own conversations" ON ai_conversations;
CREATE POLICY "Users can read own conversations" ON ai_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON ai_conversations;
CREATE POLICY "Users can create conversations" ON ai_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Anonymous users can create conversations (with client_id, no user_id)
DROP POLICY IF EXISTS "Anonymous can create conversations" ON ai_conversations;
CREATE POLICY "Anonymous can create conversations" ON ai_conversations
  FOR INSERT
  WITH CHECK (user_id IS NULL AND client_id IS NOT NULL);

-- Messages policies (inherit from conversation access)
DROP POLICY IF EXISTS "Users can read messages from own conversations" ON ai_messages;
CREATE POLICY "Users can read messages from own conversations" ON ai_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = conversation_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
CREATE POLICY "Users can create messages in own conversations" ON ai_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = conversation_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

-- Function to generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first message and conversation has no title
  IF NOT EXISTS (
    SELECT 1 FROM ai_messages
    WHERE conversation_id = NEW.conversation_id
    AND id != NEW.id
  ) AND NEW.role = 'user' THEN
    UPDATE ai_conversations
    SET
      title = LEFT(COALESCE(NEW.content, 'Nouvelle conversation'), 60),
      first_message = LEFT(COALESCE(NEW.content, ''), 200)
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ai_messages_generate_title ON ai_messages;
CREATE TRIGGER trg_ai_messages_generate_title
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_conversation_title();
