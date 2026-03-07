-- Migration to remove restrictive RLS policies on experiences bucket

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Experience owners can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Experience owners can update their media" ON storage.objects;
DROP POLICY IF EXISTS "Experience owners can delete their media" ON storage.objects;

-- Add permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload experience media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'experiences');

CREATE POLICY "Authenticated users can update their own experience media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'experiences');

CREATE POLICY "Authenticated users can delete their own experience media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'experiences');
