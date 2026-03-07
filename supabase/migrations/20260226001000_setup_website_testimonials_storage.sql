-- Switch website testimonials avatar storage from URL to Supabase Storage key

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'website_testimonials'
      AND column_name = 'avatar_url'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'website_testimonials'
      AND column_name = 'avatar_key'
  ) THEN
    ALTER TABLE public.website_testimonials
      RENAME COLUMN avatar_url TO avatar_key;
  END IF;
END $$;

-- Bucket for testimonial avatar uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-testimonials',
  'website-testimonials',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policies for the website-testimonials bucket
DROP POLICY IF EXISTS "Anyone can view website testimonial avatars" ON storage.objects;
CREATE POLICY "Anyone can view website testimonial avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-testimonials');

DROP POLICY IF EXISTS "Authenticated users can upload website testimonial avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload website testimonial avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'website-testimonials');

DROP POLICY IF EXISTS "Authenticated users can update website testimonial avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update website testimonial avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'website-testimonials');

DROP POLICY IF EXISTS "Authenticated users can delete website testimonial avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete website testimonial avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'website-testimonials');
