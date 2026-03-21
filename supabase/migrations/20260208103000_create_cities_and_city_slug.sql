-- Create cities table and add city_slug references

CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT NOT NULL UNIQUE,
  region TEXT,
  description TEXT,
  lat NUMERIC(9,6),
  lon NUMERIC(9,6),
  postal_code TEXT,
  country_code TEXT DEFAULT 'MA',
  timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX cities_slug_idx ON cities (slug) WHERE deleted_at IS NULL;
CREATE INDEX cities_active_slug_idx ON cities (slug) WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE TRIGGER trg_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add city_slug to experiences
ALTER TABLE experiences
  ADD COLUMN city_slug TEXT;

CREATE INDEX experiences_city_slug_idx ON experiences (city_slug);

ALTER TABLE experiences
  ADD CONSTRAINT experiences_city_slug_fkey
  FOREIGN KEY (city_slug) REFERENCES cities (slug);

-- Add FK to transports
ALTER TABLE transports
  ADD CONSTRAINT transports_city_slug_fkey
  FOREIGN KEY (city_slug) REFERENCES cities (slug);

-- Enable RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY cities_authenticated_read ON cities
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND is_active = TRUE);

-- Grants
GRANT SELECT ON cities TO authenticated;
