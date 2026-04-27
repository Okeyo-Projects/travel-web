-- Auto-generate a unique slug for experiences on insert or when title changes.
-- Format: {title-slug} → {title-slug}-2 → {title-slug}-3 etc. if taken.

CREATE OR REPLACE FUNCTION generate_experience_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 1;
BEGIN
  -- Only run when slug is not manually set and title is present
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.title IS NULL OR NEW.title = '' THEN
    RETURN NEW;
  END IF;

  -- Build base slug: lowercase, strip accents via unaccent, replace non-alphanum with '-'
  base_slug := lower(
    regexp_replace(
      unaccent(NEW.title),
      '[^a-z0-9]+', '-', 'g'
    )
  );
  -- Trim leading/trailing dashes
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' THEN
    RETURN NEW;
  END IF;

  candidate := base_slug;

  -- Find a slug not already taken by another experience
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM experiences
      WHERE slug = candidate
        AND id <> NEW.id
    ) THEN
      NEW.slug := candidate;
      RETURN NEW;
    END IF;

    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
END;
$$;

-- Requires the unaccent extension (already available in Supabase by default)
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS trg_experience_slug ON experiences;
CREATE TRIGGER trg_experience_slug
  BEFORE INSERT OR UPDATE OF title, slug
  ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION generate_experience_slug();
