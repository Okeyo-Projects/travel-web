-- Room items taxonomy table

CREATE TABLE IF NOT EXISTS room_items (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name JSONB NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE room_items IS 'Room-level items & amenities with localized labels';
COMMENT ON COLUMN room_items.name IS 'JSON object with fr/en/ar translations';

CREATE INDEX IF NOT EXISTS idx_room_items_category ON room_items(category);

-- Basic validation to ensure the JSON field contains expected keys
ALTER TABLE room_items
  ADD CONSTRAINT room_items_name_translations_check
  CHECK (
    name ? 'fr'
    AND name ? 'en'
    AND name ? 'ar'
  );

ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_items_public_read ON room_items
  FOR SELECT
  USING (true);
