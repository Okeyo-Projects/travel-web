-- Capture accommodation partners who request onboarding from the website.

CREATE TABLE IF NOT EXISTS potential_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  establishment_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country TEXT,
  locale TEXT CHECK (locale IS NULL OR locale IN ('fr', 'en', 'ar')),
  source TEXT NOT NULL DEFAULT 'partner_page',
  is_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS potential_partners_created_at_idx
  ON potential_partners (created_at DESC);

CREATE INDEX IF NOT EXISTS potential_partners_phone_idx
  ON potential_partners (phone);

CREATE INDEX IF NOT EXISTS potential_partners_establishment_name_idx
  ON potential_partners (lower(establishment_name));

DROP TRIGGER IF EXISTS trg_potential_partners_updated_at ON potential_partners;
CREATE TRIGGER trg_potential_partners_updated_at
  BEFORE UPDATE ON potential_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE potential_partners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON potential_partners FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON potential_partners TO service_role;
