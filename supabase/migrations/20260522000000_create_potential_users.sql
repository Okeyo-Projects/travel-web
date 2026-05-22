-- Capture anonymous chat visitors who share their contact details before signup.

CREATE TABLE IF NOT EXISTS potential_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  phone_country TEXT,
  locale TEXT CHECK (locale IS NULL OR locale IN ('fr', 'en', 'ar')),
  source TEXT NOT NULL DEFAULT 'chat_modal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS potential_users_created_at_idx
  ON potential_users (created_at DESC);

CREATE INDEX IF NOT EXISTS potential_users_phone_idx
  ON potential_users (phone);

CREATE INDEX IF NOT EXISTS potential_users_email_idx
  ON potential_users (lower(email))
  WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS trg_potential_users_updated_at ON potential_users;
CREATE TRIGGER trg_potential_users_updated_at
  BEFORE UPDATE ON potential_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE potential_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON potential_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON potential_users TO service_role;
