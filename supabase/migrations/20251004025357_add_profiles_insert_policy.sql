-- Allow authenticated users to insert their own profile row
CREATE POLICY profiles_insert_self
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Ensure policy application order is deterministic
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Automatically create a profile record when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
BEGIN
  fallback_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO profiles (id, display_name, preferred_language, currency, metadata)
  VALUES (
    NEW.id,
    COALESCE(fallback_name, 'Explorer'),
    'fr',
    'MAD',
    jsonb_build_object('onboarding_complete', false)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    preferred_language = EXCLUDED.preferred_language,
    currency = EXCLUDED.currency,
    metadata = profiles.metadata || EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_profile ON auth.users;
CREATE TRIGGER trg_handle_new_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();
