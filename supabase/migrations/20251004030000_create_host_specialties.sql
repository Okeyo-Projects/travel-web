-- Create host_specialties reference table with translations
CREATE TABLE host_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Translations for name and description (JSONB for i18n)
  name JSONB NOT NULL, -- { "fr": "...", "ar": "...", "en": "..." }
  description JSONB, -- { "fr": "...", "ar": "...", "en": "..." }
  
  -- Optional metadata for future expansion
  icon TEXT, -- Icon name or emoji
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert seed data with translations
INSERT INTO host_specialties (name, description, display_order) VALUES
  (
    '{"fr": "Séjours de luxe", "ar": "إقامات فاخرة", "en": "Luxury stays"}'::jsonb,
    '{"fr": "Hébergements haut de gamme et expériences premium", "ar": "أماكن إقامة راقية وتجارب متميزة", "en": "High-end accommodations and premium experiences"}'::jsonb,
    1
  ),
  (
    '{"fr": "Immersions culturelles", "ar": "انغماس ثقافي", "en": "Cultural immersions"}'::jsonb,
    '{"fr": "Plongées profondes dans la culture et les traditions locales", "ar": "تجارب عميقة في الثقافة والتقاليد المحلية", "en": "Deep dives into local culture and traditions"}'::jsonb,
    2
  ),
  (
    '{"fr": "Randonnées d''aventure", "ar": "رحلات المغامرة", "en": "Adventure treks"}'::jsonb,
    '{"fr": "Randonnées, trekking et aventures en plein air", "ar": "المشي لمسافات طويلة والرحلات والمغامرات في الهواء الطلق", "en": "Hiking, trekking, and outdoor adventures"}'::jsonb,
    3
  ),
  (
    '{"fr": "Voyages culinaires", "ar": "رحلات الطهي", "en": "Culinary journeys"}'::jsonb,
    '{"fr": "Visites gastronomiques, cours de cuisine et expériences culinaires", "ar": "جولات الطعام ودروس الطبخ والتجارب الذوقية", "en": "Food tours, cooking classes, and gastronomic experiences"}'::jsonb,
    4
  ),
  (
    '{"fr": "Retraites bien-être", "ar": "خلوات العافية", "en": "Wellness retreats"}'::jsonb,
    '{"fr": "Yoga, méditation, spa et expériences axées sur le bien-être", "ar": "اليوغا والتأمل والمنتجعات الصحية وتجارب العافية", "en": "Yoga, meditation, spa, and wellness-focused experiences"}'::jsonb,
    5
  ),
  (
    '{"fr": "Points forts de la ville", "ar": "معالم المدينة", "en": "City highlights"}'::jsonb,
    '{"fr": "Exploration urbaine et visites de la ville", "ar": "استكشاف المدينة والجولات الحضرية", "en": "Urban exploration and city tours"}'::jsonb,
    6
  );

-- Create indexes for performance
CREATE INDEX idx_host_specialties_active ON host_specialties(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_host_specialties_display_order ON host_specialties(display_order);

-- Auto-update updated_at timestamp
CREATE TRIGGER trg_host_specialties_updated_at
  BEFORE UPDATE ON host_specialties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE host_specialties ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read active specialties
CREATE POLICY "Anyone can view active specialties"
  ON host_specialties
  FOR SELECT
  USING (is_active = TRUE);

-- Only authenticated users need to see all (for admin purposes)
CREATE POLICY "Authenticated users can view all specialties"
  ON host_specialties
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Update hosts table to store specialty IDs instead of names
ALTER TABLE hosts 
  DROP COLUMN IF EXISTS specialties,
  ADD COLUMN specialty_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX idx_hosts_specialty_ids ON hosts USING GIN(specialty_ids);

-- Comment
COMMENT ON TABLE host_specialties IS 'Reference table for host specialty categories with i18n support';
COMMENT ON COLUMN hosts.specialty_ids IS 'Array of host_specialty IDs (replaces old specialties column)';