-- Experience tables

-- Base experiences table
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  
  -- Type
  type experience_type NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  short_description TEXT NOT NULL CHECK (LENGTH(short_description) <= 150),
  long_description TEXT NOT NULL CHECK (LENGTH(long_description) >= 50),
  
  -- Media (immersive video 10-180 sec)
  video_id UUID, -- FK added later after media_assets exists
  thumbnail_url TEXT,
  
  -- Location
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  address JSONB,
  
  -- Language (fr, ar, en)
  languages TEXT[] NOT NULL DEFAULT ARRAY['fr'] CHECK (array_length(languages, 1) >= 1),
  
  -- Policies
  cancellation_policy cancellation_policy NOT NULL DEFAULT 'moderate',
  
  -- Status
  status experience_status DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- SEO & Discovery
  slug TEXT UNIQUE,
  tags TEXT[],
  search_vector tsvector,
  
  -- Stats (denormalized)
  views_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,
  bookings_count INT DEFAULT 0,
  avg_rating NUMERIC(3,2),
  reviews_count INT DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Lodging subtype table
CREATE TABLE experiences_lodging (
  experience_id UUID PRIMARY KEY REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Type
  lodging_type lodging_type NOT NULL,
  
  -- Policies
  non_fumeur BOOLEAN DEFAULT TRUE,
  animaux_acceptes BOOLEAN DEFAULT FALSE,
  check_in_time TIME,
  check_out_time TIME,
  min_stay_nights INT DEFAULT 1,
  max_stay_nights INT,
  
  -- Additional Info
  house_rules TEXT,
  accessibility_features TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Lodging room types
CREATE TABLE lodging_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Type
  room_type room_type NOT NULL,
  name TEXT,
  description TEXT,
  
  -- Capacity
  capacity_beds INT NOT NULL CHECK (capacity_beds > 0),
  max_persons INT NOT NULL CHECK (max_persons > 0),
  
  -- Pricing (per night)
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (LENGTH(currency) = 3),
  
  -- Extra Fees (optional)
  extra_fees JSONB DEFAULT '{}'::jsonb,
  
  -- Equipment/Amenities
  equipments TEXT[] DEFAULT '{}',
  
  -- Inventory
  total_rooms INT NOT NULL DEFAULT 1,
  
  -- Media
  photos TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Trip subtype table
CREATE TABLE experiences_trip (
  experience_id UUID PRIMARY KEY REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Category
  category trip_category NOT NULL,
  skill_level skill_level,
  
  -- Route
  departure_place TEXT NOT NULL,
  arrival_place TEXT,
  stops TEXT[],
  
  -- Duration
  duration_days INT CHECK (duration_days >= 0),
  duration_hours INT CHECK (duration_hours >= 0),
  start_time TIME,
  end_time TIME,
  
  -- Participants
  group_size_max INT NOT NULL CHECK (group_size_max > 0),
  min_participants INT DEFAULT 1,
  min_age INT CHECK (min_age >= 0),
  restrictions TEXT,
  
  -- Pricing (per person)
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (LENGTH(currency) = 3),
  
  -- Special Pricing (optional)
  price_children_cents INT CHECK (price_children_cents >= 0),
  price_group_cents INT CHECK (price_group_cents >= 0),
  price_students_cents INT CHECK (price_students_cents >= 0),
  
  -- Additional Info
  what_to_bring TEXT,
  physical_difficulty INT CHECK (physical_difficulty BETWEEN 1 AND 5),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trip itinerary
CREATE TABLE trip_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Ordering
  day_number INT CHECK (day_number > 0),
  order_index INT NOT NULL DEFAULT 0,
  
  -- Content
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  
  -- Timing
  time_range TSTZRANGE,
  duration_minutes INT,
  
  -- Location
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  
  -- Media
  photos TEXT[],
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trip departures (scheduled trips with inventory)
CREATE TABLE trip_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  
  -- Schedule
  depart_at TIMESTAMPTZ NOT NULL,
  return_at TIMESTAMPTZ,
  
  -- Inventory
  seats_total INT NOT NULL CHECK (seats_total > 0),
  seats_available INT NOT NULL CHECK (seats_available >= 0),
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  cancellation_reason TEXT,
  
  -- Pricing Override (optional)
  price_override_cents INT CHECK (price_override_cents >= 0),
  
  -- Guide/Host
  guide_id UUID REFERENCES profiles(id),
  guide_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT seats_capacity CHECK (seats_available <= seats_total)
);

-- Amenities taxonomy (for lodging)
CREATE TABLE amenities (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_ar TEXT,
  label_en TEXT,
  icon TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Experience amenities (many-to-many)
CREATE TABLE experience_amenities (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  amenity_key TEXT NOT NULL REFERENCES amenities(key) ON DELETE CASCADE,
  
  PRIMARY KEY (experience_id, amenity_key)
);

-- Services taxonomy (for trips)
CREATE TABLE services (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_ar TEXT,
  label_en TEXT,
  icon TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Experience services included
CREATE TABLE experience_services_included (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL REFERENCES services(key) ON DELETE CASCADE,
  notes TEXT,
  
  PRIMARY KEY (experience_id, service_key)
);

-- Experience services excluded
CREATE TABLE experience_services_excluded (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL REFERENCES services(key) ON DELETE CASCADE,
  notes TEXT,
  
  PRIMARY KEY (experience_id, service_key)
);

-- Triggers for updated_at
CREATE TRIGGER trg_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lodging_updated_at
  BEFORE UPDATE ON experiences_lodging
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trip_updated_at
  BEFORE UPDATE ON experiences_trip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

