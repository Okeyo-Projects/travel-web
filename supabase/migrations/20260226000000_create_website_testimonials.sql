-- Create testimonials managed from admin for website rendering

CREATE TABLE IF NOT EXISTS website_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_url TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  rate SMALLINT NOT NULL DEFAULT 5 CHECK (rate BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS website_testimonials_sort_idx
  ON website_testimonials (sort_order ASC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS website_testimonials_active_sort_idx
  ON website_testimonials (sort_order ASC, created_at DESC)
  WHERE deleted_at IS NULL AND is_active = TRUE;

DROP TRIGGER IF EXISTS trg_website_testimonials_updated_at ON website_testimonials;
CREATE TRIGGER trg_website_testimonials_updated_at
  BEFORE UPDATE ON website_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS website_testimonials_public_read ON website_testimonials;
CREATE POLICY website_testimonials_public_read ON website_testimonials
  FOR SELECT
  USING (deleted_at IS NULL AND is_active = TRUE);

DROP POLICY IF EXISTS website_testimonials_authenticated_manage ON website_testimonials;
CREATE POLICY website_testimonials_authenticated_manage ON website_testimonials
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON website_testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON website_testimonials TO authenticated;
