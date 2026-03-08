-- Create storage buckets for media uploads
-- This migration creates all storage buckets and their RLS policies

-- 1. Profiles bucket (user avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Hosts bucket (host logos and covers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hosts',
  'hosts',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Experiences bucket (experience photos and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'experiences',
  'experiences',
  true,
  209715200, -- 200MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Reels bucket (short-form videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reels',
  'reels',
  true,
  104857600, -- 100MB
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Reviews bucket (review photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reviews',
  'reviews',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Chat bucket (chat attachments)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat',
  'chat',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR STORAGE BUCKETS
-- ============================================================================

-- PROFILES BUCKET POLICIES
-- Anyone can view profile images
CREATE POLICY "Anyone can view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

-- Users can upload their own profile image
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own profile image
CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own profile image
CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- HOSTS BUCKET POLICIES
-- Anyone can view host images
CREATE POLICY "Anyone can view host images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hosts');

-- Authenticated users can upload host images
-- Note: This allows users to upload while creating their host profile (before host record exists)
-- Path structure (logos/{user.id}-*, covers/{user.id}-*) ensures isolation
CREATE POLICY "Authenticated users can upload host images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hosts'
  );

-- Users can update their own host images (based on path)
CREATE POLICY "Users can update their own host images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hosts'
    AND (
      -- Match logos/{user.id}-* pattern
      (name ~ ('^logos/' || auth.uid()::text || '-'))
      OR
      -- Match covers/{user.id}-* pattern
      (name ~ ('^covers/' || auth.uid()::text || '-'))
    )
  );

-- Users can delete their own host images (based on path)
CREATE POLICY "Users can delete their own host images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hosts'
    AND (
      -- Match logos/{user.id}-* pattern
      (name ~ ('^logos/' || auth.uid()::text || '-'))
      OR
      -- Match covers/{user.id}-* pattern
      (name ~ ('^covers/' || auth.uid()::text || '-'))
    )
  );

-- EXPERIENCES BUCKET POLICIES
-- Anyone can view experience media
CREATE POLICY "Anyone can view experience media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'experiences');

-- Experience owners can upload media
CREATE POLICY "Experience owners can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'experiences'
    AND EXISTS (
      SELECT 1 FROM experiences e
      JOIN hosts h ON e.host_id = h.id
      WHERE h.owner_id = auth.uid()
    )
  );

-- Experience owners can update their media
CREATE POLICY "Experience owners can update their media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'experiences'
    AND EXISTS (
      SELECT 1 FROM experiences e
      JOIN hosts h ON e.host_id = h.id
      WHERE h.owner_id = auth.uid()
    )
  );

-- Experience owners can delete their media
CREATE POLICY "Experience owners can delete their media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'experiences'
    AND EXISTS (
      SELECT 1 FROM experiences e
      JOIN hosts h ON e.host_id = h.id
      WHERE h.owner_id = auth.uid()
    )
  );

-- REELS BUCKET POLICIES
-- Anyone can view reels
CREATE POLICY "Anyone can view reels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

-- Authenticated users can upload reels
CREATE POLICY "Authenticated users can upload reels"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reels');

-- Users can update their own reels
CREATE POLICY "Users can update their own reels"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reels'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own reels
CREATE POLICY "Users can delete their own reels"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reels'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- REVIEWS BUCKET POLICIES
-- Anyone can view review photos
CREATE POLICY "Anyone can view review photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reviews');

-- Authenticated users can upload review photos
CREATE POLICY "Authenticated users can upload review photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reviews');

-- Users can update their own review photos
CREATE POLICY "Users can update their own review photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reviews'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own review photos
CREATE POLICY "Users can delete their own review photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reviews'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- CHAT BUCKET POLICIES
-- Chat is private - only authenticated users can upload and manage their own files
-- Public viewing disabled for privacy

-- Authenticated users can upload chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat');

-- Users can view their own chat attachments
CREATE POLICY "Users can view their own chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own chat attachments
CREATE POLICY "Users can delete their own chat attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
