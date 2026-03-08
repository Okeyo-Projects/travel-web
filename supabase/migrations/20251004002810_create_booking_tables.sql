-- Booking, Payment, and Review tables

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  experience_id UUID NOT NULL REFERENCES experiences(id),
  guest_id UUID NOT NULL REFERENCES profiles(id),
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
  
  -- For lodging: room allocations
  rooms JSONB, -- [{room_type_id: uuid, quantity: 2}]
  
  -- Pricing
  price_subtotal_cents INT NOT NULL CHECK (price_subtotal_cents >= 0),
  price_fees_cents INT DEFAULT 0,
  price_taxes_cents INT DEFAULT 0,
  price_total_cents INT NOT NULL CHECK (price_total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD',
  
  -- Status
  status booking_status DEFAULT 'draft',
  payment_intent_id TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  
  -- Notes
  guest_notes TEXT,
  host_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Booking
  booking_id UUID NOT NULL REFERENCES bookings(id),
  
  -- Payment Provider (Stripe, local gateway, etc.)
  provider TEXT NOT NULL,
  provider_ref TEXT,
  provider_metadata JSONB,
  
  -- Amount
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL,
  
  -- Status
  status payment_status DEFAULT 'pending',
  
  -- Timeline
  attempted_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Refund
  refunded_at TIMESTAMPTZ,
  refund_amount_cents INT CHECK (refund_amount_cents >= 0),
  refund_reason TEXT,
  
  -- Security
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Booking (one review per booking)
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Ratings
  rating_overall INT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_accuracy INT CHECK (rating_accuracy BETWEEN 1 AND 5),
  rating_cleanliness INT CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_location INT CHECK (rating_location BETWEEN 1 AND 5),
  rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
  
  -- Content
  title TEXT,
  text TEXT NOT NULL CHECK (LENGTH(text) >= 10),
  
  -- Media
  photos TEXT[],
  
  -- Host Response
  host_response TEXT,
  host_responded_at TIMESTAMPTZ,
  
  -- Flags
  is_verified BOOLEAN DEFAULT FALSE,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Triggers
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

