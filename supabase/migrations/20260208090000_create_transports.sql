-- Create transports and booking_transports tables

CREATE TABLE transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  city_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,

  price_cents INT NOT NULL CHECK (price_cents >= 0),
  price_additional_per_person_cents INT NOT NULL DEFAULT 0 CHECK (price_additional_per_person_cents >= 0),
  max_persons INT NOT NULL CHECK (max_persons > 0),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (LENGTH(currency) = 3),

  is_available BOOLEAN NOT NULL DEFAULT TRUE,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE booking_transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  transport_id UUID REFERENCES transports(id) ON DELETE SET NULL,

  city_slug TEXT NOT NULL,
  type TEXT NOT NULL,

  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  price_additional_per_person_cents INT NOT NULL DEFAULT 0 CHECK (price_additional_per_person_cents >= 0),
  max_persons INT NOT NULL CHECK (max_persons > 0),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (LENGTH(currency) = 3),
  total_cents INT NOT NULL CHECK (total_cents >= 0),

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX transports_city_slug_idx ON transports (city_slug) WHERE deleted_at IS NULL;
CREATE INDEX transports_available_city_slug_idx ON transports (city_slug) WHERE deleted_at IS NULL AND is_available = TRUE;
CREATE INDEX booking_transports_booking_id_idx ON booking_transports (booking_id);

-- Triggers
CREATE TRIGGER trg_transports_updated_at
  BEFORE UPDATE ON transports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_booking_transports_updated_at
  BEFORE UPDATE ON booking_transports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_transports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY transports_authenticated_read ON transports
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND is_available = TRUE);

CREATE POLICY booking_transports_guest_read ON booking_transports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.id = booking_transports.booking_id
        AND b.guest_id = auth.uid()
        AND b.deleted_at IS NULL
    )
  );

CREATE POLICY booking_transports_guest_insert ON booking_transports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.id = booking_transports.booking_id
        AND b.guest_id = auth.uid()
        AND b.deleted_at IS NULL
    )
  );

-- Grants
GRANT SELECT ON transports TO authenticated;
GRANT SELECT, INSERT ON booking_transports TO authenticated;
