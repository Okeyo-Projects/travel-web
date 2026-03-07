-- Core tables: profiles and hosts

-- Profiles table (mirrors auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identity
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- Status
  is_host BOOLEAN DEFAULT FALSE,
  status profile_status DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Preferences
  preferred_language TEXT DEFAULT 'fr' CHECK (preferred_language IN ('fr', 'ar', 'en')),
  currency TEXT DEFAULT 'MAD' CHECK (LENGTH(currency) = 3),
  timezone TEXT DEFAULT 'Africa/Casablanca',
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Hosts table
CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  
  -- Contact
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Location
  country TEXT NOT NULL,
  city TEXT,
  address JSONB,
  
  -- Status
  verified BOOLEAN DEFAULT FALSE,
  status host_status DEFAULT 'active',
  
  -- Stats (denormalized for performance)
  total_experiences INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  avg_rating NUMERIC(3,2),
  response_rate NUMERIC(3,2),
  response_time_hours INT,
  
  -- Metadata
  languages TEXT[] DEFAULT ARRAY['fr'],
  specialties TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Unique constraint: one host profile per owner
CREATE UNIQUE INDEX idx_hosts_owner_id ON hosts(owner_id) WHERE deleted_at IS NULL;

-- Trigger to set is_host flag on profile when host record is created
CREATE OR REPLACE FUNCTION set_profile_is_host()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET is_host = TRUE WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_hosts_set_is_host
  AFTER INSERT ON hosts
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_is_host();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hosts_updated_at
  BEFORE UPDATE ON hosts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

