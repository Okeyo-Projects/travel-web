-- Availability tables for lodging and activity experiences

-- Lodging availability by room type & date
CREATE TABLE lodging_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES lodging_room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  rooms_total INT NOT NULL CHECK (rooms_total >= 0),
  rooms_available INT NOT NULL CHECK (rooms_available >= 0),
  price_override_cents INT CHECK (price_override_cents >= 0),
  min_stay_nights INT CHECK (min_stay_nights >= 0),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT lodging_rooms_capacity CHECK (rooms_available <= rooms_total),
  CONSTRAINT lodging_availability_unique UNIQUE (room_type_id, date)
);

CREATE INDEX idx_lodging_availability_experience_date
  ON lodging_availability (experience_id, date);

CREATE TRIGGER trg_lodging_availability_updated_at
  BEFORE UPDATE ON lodging_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Activity session-based availability
CREATE TABLE activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  
  capacity_total INT NOT NULL CHECK (capacity_total > 0),
  capacity_available INT NOT NULL CHECK (capacity_available >= 0),
  price_override_cents INT CHECK (price_override_cents >= 0),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT activity_capacity_limit CHECK (capacity_available <= capacity_total),
  CONSTRAINT activity_sessions_unique UNIQUE (experience_id, start_at)
);

CREATE INDEX idx_activity_sessions_experience_start
  ON activity_sessions (experience_id, start_at);

CREATE TRIGGER trg_activity_sessions_updated_at
  BEFORE UPDATE ON activity_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
