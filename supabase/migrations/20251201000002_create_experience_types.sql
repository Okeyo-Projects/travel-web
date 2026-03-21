-- Create experience_type enum
CREATE TYPE experience_type_enum AS ENUM ('lodge', 'trip', 'activity');

-- Create experience_type table for homepage collections
CREATE TABLE IF NOT EXISTS experience_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL, -- {fr: "...", en: "...", ar: "..."}
  type experience_type_enum NOT NULL UNIQUE,
  asset TEXT, -- path to the image/asset
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS experience_types_order_idx
  ON experience_types (order_index) WHERE is_active = true;

-- Create index for type lookup
CREATE INDEX IF NOT EXISTS experience_types_type_idx
  ON experience_types (type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_experience_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experience_types_updated_at
  BEFORE UPDATE ON experience_types
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_types_updated_at();

-- Insert default experience types
INSERT INTO experience_types (title, type, order_index) VALUES
  ('{"en": "Lodges", "fr": "Hébergements", "ar": "النزل"}'::jsonb, 'lodge', 1),
  ('{"en": "Trips", "fr": "Voyages", "ar": "الرحلات"}'::jsonb, 'trip', 2),
  ('{"en": "Activities", "fr": "Activités", "ar": "الأنشطة"}'::jsonb, 'activity', 3)
ON CONFLICT (type) DO NOTHING;

-- Enable RLS
ALTER TABLE experience_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active experience types
CREATE POLICY "Allow public read access to active experience types"
  ON experience_types
  FOR SELECT
  USING (is_active = true);

-- Only authenticated users can manage experience types (admin functionality)
CREATE POLICY "Allow authenticated users to manage experience types"
  ON experience_types
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
