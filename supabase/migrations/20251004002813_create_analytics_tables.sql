-- Analytics and Feature Flags tables

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User (nullable for anonymous)
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  
  -- Event
  name TEXT NOT NULL, -- reel_view, experience_view, booking_started, etc.
  props JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  experience_id UUID,
  reel_id UUID,
  booking_id UUID,
  
  -- Device
  platform TEXT, -- ios, android, web
  app_version TEXT,
  device_id TEXT,
  
  -- Location
  ip_address INET,
  country TEXT,
  city TEXT,
  
  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  
  -- Timestamp
  ts TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Affiliations (referral tracking)
CREATE TABLE affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code
  code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Terms
  payout_ratio NUMERIC(5,4) NOT NULL CHECK (payout_ratio BETWEEN 0 AND 1),
  
  -- Stats
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  total_earned_cents INT DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Affiliation clicks
CREATE TABLE affiliation_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_id UUID NOT NULL REFERENCES affiliations(id),
  
  clicked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  device_id TEXT,
  ip_address INET,
  referrer TEXT
);

-- Affiliation conversions (linked to bookings)
CREATE TABLE affiliation_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_id UUID NOT NULL REFERENCES affiliations(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  
  amount_cents INT NOT NULL,
  commission_cents INT NOT NULL,
  
  converted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Feature flags
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INT DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  allowed_users UUID[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Triggers
CREATE TRIGGER trg_affiliations_updated_at
  BEFORE UPDATE ON affiliations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

