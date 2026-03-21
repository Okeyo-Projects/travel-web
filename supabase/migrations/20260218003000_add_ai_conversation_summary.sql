-- Add summary preview field for AI conversations
-- Used by the sidebar to show a short assistant-generated recap.

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Backfill with the latest assistant message snippet for existing threads.
WITH latest_assistant_message AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    LEFT(REGEXP_REPLACE(BTRIM(content), '\\s+', ' ', 'g'), 180) AS summary_text
  FROM ai_messages
  WHERE role = 'assistant'
    AND content IS NOT NULL
    AND BTRIM(content) <> ''
  ORDER BY conversation_id, created_at DESC
)
UPDATE ai_conversations AS c
SET summary = m.summary_text
FROM latest_assistant_message AS m
WHERE c.id = m.conversation_id
  AND COALESCE(BTRIM(c.summary), '') = '';
