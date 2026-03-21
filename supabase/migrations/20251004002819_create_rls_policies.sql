-- Row Level Security (RLS) Policies

-- =====================================
-- PROFILES
-- =====================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile fully
CREATE POLICY profiles_own_read ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY profiles_own_write ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- All authenticated users can read other users' active profiles
CREATE POLICY profiles_users_read ON profiles
  FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- =====================================
-- HOSTS
-- =====================================
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

-- Hosts can manage their own host profile
CREATE POLICY hosts_own_manage ON hosts
  FOR ALL
  USING (auth.uid() = owner_id);

-- Public can view active hosts
CREATE POLICY hosts_public_read ON hosts
  FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- =====================================
-- EXPERIENCES
-- =====================================
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Public can view published experiences
CREATE POLICY experiences_public_read ON experiences
  FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

-- Hosts can manage their own experiences
CREATE POLICY experiences_host_manage ON experiences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hosts h 
      WHERE h.id = experiences.host_id 
        AND h.owner_id = auth.uid()
    )
  );

-- Enable RLS on experience subtypes
ALTER TABLE experiences_lodging ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences_trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_departures ENABLE ROW LEVEL SECURITY;

-- Subtype policies (inherit from parent experience)
CREATE POLICY lodging_access ON experiences_lodging
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experiences_lodging.experience_id
        AND (e.status = 'published' OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = e.host_id AND h.owner_id = auth.uid()))
    )
  );

CREATE POLICY trip_access ON experiences_trip
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experiences_trip.experience_id
        AND (e.status = 'published' OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = e.host_id AND h.owner_id = auth.uid()))
    )
  );

CREATE POLICY room_types_access ON lodging_room_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = lodging_room_types.experience_id
        AND (e.status = 'published' OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = e.host_id AND h.owner_id = auth.uid()))
    )
  );

CREATE POLICY trip_itinerary_access ON trip_itinerary
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = trip_itinerary.experience_id
        AND (e.status = 'published' OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = e.host_id AND h.owner_id = auth.uid()))
    )
  );

CREATE POLICY trip_departures_access ON trip_departures
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = trip_departures.experience_id
        AND (e.status = 'published' OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = e.host_id AND h.owner_id = auth.uid()))
    )
  );

-- =====================================
-- MEDIA
-- =====================================
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Owners can manage their media
CREATE POLICY media_own_manage ON media_assets
  FOR ALL
  USING (auth.uid() = owner_id);

-- Public can view media linked to published experiences
CREATE POLICY media_public_read ON media_assets
  FOR SELECT
  USING (
    deleted_at IS NULL AND processing_status = 'completed' AND
    (EXISTS (
      SELECT 1 FROM experience_media em
      JOIN experiences e ON e.id = em.experience_id
      WHERE em.media_id = media_assets.id AND e.status = 'published'
    ) OR EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.video_id = media_assets.id AND e.status = 'published'
    ) OR EXISTS (
      SELECT 1 FROM reels r
      WHERE r.video_id = media_assets.id AND r.visibility = 'public'
    ))
  );

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Authors can manage their reels
CREATE POLICY reels_own_manage ON reels
  FOR ALL
  USING (auth.uid() = author_id);

-- Public can view public reels
CREATE POLICY reels_public_read ON reels
  FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);

-- =====================================
-- BOOKINGS
-- =====================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Guests can view and create their own bookings
CREATE POLICY bookings_guest_manage ON bookings
  FOR ALL
  USING (auth.uid() = guest_id);

-- Hosts can view bookings for their experiences
CREATE POLICY bookings_host_read ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hosts h
      WHERE h.id = bookings.host_id AND h.owner_id = auth.uid()
    )
  );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Guests and hosts can view related payments
CREATE POLICY payments_access ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
        AND (b.guest_id = auth.uid() OR 
             EXISTS (SELECT 1 FROM hosts h WHERE h.id = b.host_id AND h.owner_id = auth.uid()))
    )
  );

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Authors can manage their reviews
CREATE POLICY reviews_own_manage ON reviews
  FOR ALL
  USING (auth.uid() = author_id);

-- Public can read reviews for published experiences
CREATE POLICY reviews_public_read ON reviews
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (SELECT 1 FROM experiences e WHERE e.id = reviews.experience_id AND e.status = 'published')
  );

-- =====================================
-- SOCIAL
-- =====================================
ALTER TABLE social_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users can manage their own social actions
CREATE POLICY social_likes_own ON social_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY social_shares_own ON social_shares FOR ALL USING (auth.uid() = user_id);
CREATE POLICY social_saves_own ON social_saves FOR ALL USING (auth.uid() = user_id);
CREATE POLICY follows_own ON follows FOR ALL USING (auth.uid() = follower_id);

-- Public can read aggregated counts (queries will use counts, not individual records)
CREATE POLICY social_likes_read ON social_likes FOR SELECT USING (TRUE);
CREATE POLICY social_shares_read ON social_shares FOR SELECT USING (TRUE);
CREATE POLICY social_saves_read ON social_saves FOR SELECT USING (TRUE);
CREATE POLICY follows_read ON follows FOR SELECT USING (TRUE);

-- =====================================
-- CHATS
-- =====================================
ALTER TABLE chats_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats_messages ENABLE ROW LEVEL SECURITY;

-- Only participants can access threads
CREATE POLICY threads_participants_only ON chats_threads
  FOR ALL
  USING (auth.uid() = ANY(participants));

-- Only thread participants can view messages
CREATE POLICY messages_participants_read ON chats_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats_threads t
      WHERE t.id = chats_messages.thread_id
        AND auth.uid() = ANY(t.participants)
    )
  );

-- Only thread participants can send messages
CREATE POLICY messages_send ON chats_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats_threads t
      WHERE t.id = thread_id
        AND auth.uid() = ANY(t.participants)
    )
  );

-- =====================================
-- NOTIFICATIONS
-- =====================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY notifications_own ON notifications
  FOR ALL
  USING (auth.uid() = user_id);

-- =====================================
-- ANALYTICS (Permissive for tracking)
-- =====================================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking)
CREATE POLICY analytics_insert ON analytics_events
  FOR INSERT
  WITH CHECK (TRUE);

-- Users can view their own events
CREATE POLICY analytics_own_read ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================
-- TAXONOMIES (Public Read)
-- =====================================
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY amenities_public ON amenities FOR SELECT USING (TRUE);
CREATE POLICY services_public ON services FOR SELECT USING (TRUE);

-- =====================================
-- FEATURE FLAGS (Public Read)
-- =====================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY feature_flags_public ON feature_flags FOR SELECT USING (TRUE);

