-- Booking items for multi-experience bookings

CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id),
  host_id UUID NOT NULL REFERENCES hosts(id),

  -- Dates
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  CHECK (to_date >= from_date),

  -- Party Details
  adults INT NOT NULL DEFAULT 1 CHECK (adults > 0),
  children INT DEFAULT 0 CHECK (children >= 0),
  infants INT DEFAULT 0 CHECK (infants >= 0),
  party_details JSONB,

  -- For trips: specific departure
  departure_id UUID REFERENCES trip_departures(id),

  -- For activities: specific session
  session_id UUID REFERENCES activity_sessions(id),

  -- For lodging: room allocations
  rooms JSONB,

  -- Pricing
  price_subtotal_cents INT NOT NULL CHECK (price_subtotal_cents >= 0),
  price_fees_cents INT DEFAULT 0,
  price_taxes_cents INT DEFAULT 0,
  price_total_cents INT NOT NULL CHECK (price_total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD',

  -- Status
  status booking_status DEFAULT 'draft',

  -- Notes
  guest_notes TEXT,
  host_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Ordering (optional)
  order_index INT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_experience ON booking_items(experience_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_host ON booking_items(host_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_status ON booking_items(status);
CREATE INDEX IF NOT EXISTS idx_booking_items_dates ON booking_items(from_date, to_date);

-- Triggers
DROP TRIGGER IF EXISTS trg_booking_items_updated_at ON booking_items;
CREATE TRIGGER trg_booking_items_updated_at
  BEFORE UPDATE ON booking_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

-- Guests can manage booking items belonging to their bookings
DROP POLICY IF EXISTS booking_items_guest_manage ON booking_items;
CREATE POLICY booking_items_guest_manage ON booking_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_items.booking_id
        AND b.guest_id = auth.uid()
    )
  );

-- Hosts can read booking items for their experiences
DROP POLICY IF EXISTS booking_items_host_read ON booking_items;
CREATE POLICY booking_items_host_read ON booking_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hosts h
      WHERE h.id = booking_items.host_id
        AND h.owner_id = auth.uid()
    )
  );

-- Backfill existing bookings as single-item bookings
INSERT INTO booking_items (
  booking_id,
  experience_id,
  host_id,
  from_date,
  to_date,
  adults,
  children,
  infants,
  party_details,
  departure_id,
  session_id,
  rooms,
  price_subtotal_cents,
  price_fees_cents,
  price_taxes_cents,
  price_total_cents,
  currency,
  status,
  guest_notes,
  host_notes,
  metadata,
  order_index,
  created_at,
  updated_at
)
SELECT
  b.id,
  b.experience_id,
  b.host_id,
  b.from_date,
  b.to_date,
  b.adults,
  b.children,
  b.infants,
  b.party_details,
  b.departure_id,
  b.session_id,
  b.rooms,
  b.price_subtotal_cents,
  b.price_fees_cents,
  b.price_taxes_cents,
  b.price_total_cents,
  b.currency,
  b.status,
  b.guest_notes,
  b.host_notes,
  b.metadata,
  0,
  b.created_at,
  b.updated_at
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM booking_items bi WHERE bi.booking_id = b.id
);
