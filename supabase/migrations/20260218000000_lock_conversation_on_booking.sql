-- Add booking lock columns to ai_conversations
-- When a booking is confirmed from the chat, the conversation is locked:
-- no more messages can be sent, and the UI shows a success state.

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Index for fast lookup of locked conversations
CREATE INDEX IF NOT EXISTS ai_conversations_booking_id_idx
  ON ai_conversations(booking_id)
  WHERE booking_id IS NOT NULL;
