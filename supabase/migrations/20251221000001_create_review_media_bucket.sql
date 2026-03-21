-- Create storage bucket for review media (photos and videos)

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-media',
  'review-media',
  true,
  104857600, -- 100MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- RLS Policies for review-media bucket

-- Users can upload their own review media
CREATE POLICY "Users can upload review media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view review media (public bucket)
CREATE POLICY "Anyone can view review media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-media');

-- Users can delete their own review media
CREATE POLICY "Users can delete their own review media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
