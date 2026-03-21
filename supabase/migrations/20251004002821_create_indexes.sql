-- Performance Indexes

-- =====================================
-- PROFILES
-- =====================================
CREATE INDEX idx_profiles_status ON profiles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_email ON profiles(email_verified) WHERE email_verified = TRUE;

-- =====================================
-- HOSTS
-- =====================================
CREATE INDEX idx_hosts_status ON hosts(status) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_hosts_verified ON hosts(verified) WHERE verified = TRUE;
CREATE INDEX idx_hosts_country_city ON hosts(country, city);
CREATE INDEX idx_hosts_slug ON hosts(slug);

-- =====================================
-- EXPERIENCES
-- =====================================
CREATE INDEX idx_experiences_host ON experiences(host_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_experiences_type ON experiences(type);
CREATE INDEX idx_experiences_status ON experiences(status) WHERE status = 'published';
CREATE INDEX idx_experiences_location ON experiences USING GIST(location);
CREATE INDEX idx_experiences_city ON experiences(city);
CREATE INDEX idx_experiences_region ON experiences(region);
CREATE INDEX idx_experiences_created ON experiences(created_at DESC);
CREATE INDEX idx_experiences_rating ON experiences(avg_rating DESC) WHERE avg_rating IS NOT NULL;
CREATE INDEX idx_experiences_views ON experiences(views_count DESC);
CREATE INDEX idx_experiences_bookings ON experiences(bookings_count DESC);
CREATE INDEX idx_experiences_slug ON experiences(slug);
CREATE INDEX idx_experiences_search ON experiences USING GIN(search_vector);
CREATE INDEX idx_experiences_tags ON experiences USING GIN(tags);

-- =====================================
-- EXPERIENCE SUBTYPES
-- =====================================
CREATE INDEX idx_lodging_type ON experiences_lodging(lodging_type);
CREATE INDEX idx_room_types_exp ON lodging_room_types(experience_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_room_types_price ON lodging_room_types(price_cents);

CREATE INDEX idx_trip_category ON experiences_trip(category);
CREATE INDEX idx_trip_level ON experiences_trip(skill_level);
CREATE INDEX idx_trip_price ON experiences_trip(price_cents);
CREATE INDEX idx_trip_itinerary_exp ON trip_itinerary(experience_id);
CREATE INDEX idx_trip_departures_exp ON trip_departures(experience_id);
CREATE INDEX idx_trip_departures_date ON trip_departures(depart_at) WHERE status = 'scheduled';
CREATE INDEX idx_trip_departures_availability ON trip_departures(seats_available) WHERE seats_available > 0;

-- =====================================
-- MEDIA
-- =====================================
CREATE INDEX idx_media_owner ON media_assets(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_status ON media_assets(processing_status);
CREATE INDEX idx_media_kind ON media_assets(kind);
CREATE INDEX idx_experience_media_exp ON experience_media(experience_id);
CREATE INDEX idx_experience_media_asset ON experience_media(media_id);

-- =====================================
-- REELS
-- =====================================
CREATE INDEX idx_reels_author ON reels(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reels_experience ON reels(experience_id);
CREATE INDEX idx_reels_visibility ON reels(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_reels_created ON reels(created_at DESC);
CREATE INDEX idx_reels_views ON reels(views_count DESC);
CREATE INDEX idx_reels_featured ON reels(is_featured) WHERE is_featured = TRUE;

-- =====================================
-- BOOKINGS
-- =====================================
CREATE INDEX idx_bookings_guest ON bookings(guest_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_host ON bookings(host_id);
CREATE INDEX idx_bookings_experience ON bookings(experience_id);
CREATE INDEX idx_bookings_departure ON bookings(departure_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(from_date, to_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref);

CREATE INDEX idx_reviews_experience ON reviews(experience_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_author ON reviews(author_id);
CREATE INDEX idx_reviews_rating ON reviews(rating_overall);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- =====================================
-- SOCIAL
-- =====================================
CREATE INDEX idx_likes_user ON social_likes(user_id);
CREATE INDEX idx_likes_target ON social_likes(target_type, target_id);
CREATE INDEX idx_shares_user ON social_shares(user_id);
CREATE INDEX idx_shares_experience ON social_shares(experience_id);
CREATE INDEX idx_shares_created ON social_shares(created_at DESC);
CREATE INDEX idx_saves_user ON social_saves(user_id);
CREATE INDEX idx_saves_experience ON social_saves(experience_id);
CREATE INDEX idx_saves_collection ON social_saves(user_id, collection_name);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_type, following_id);

-- =====================================
-- CHATS
-- =====================================
CREATE INDEX idx_threads_participants ON chats_threads USING GIN(participants);
CREATE INDEX idx_threads_experience ON chats_threads(experience_id);
CREATE INDEX idx_threads_booking ON chats_threads(booking_id);
CREATE INDEX idx_threads_last_message ON chats_threads(last_message_at DESC);
CREATE INDEX idx_messages_thread ON chats_messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_sender ON chats_messages(sender_id);

-- =====================================
-- NOTIFICATIONS
-- =====================================
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_kind ON notifications(kind);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- =====================================
-- ANALYTICS
-- =====================================
CREATE INDEX idx_analytics_user ON analytics_events(user_id, ts DESC);
CREATE INDEX idx_analytics_name ON analytics_events(name, ts DESC);
CREATE INDEX idx_analytics_experience ON analytics_events(experience_id) WHERE experience_id IS NOT NULL;
CREATE INDEX idx_analytics_reel ON analytics_events(reel_id) WHERE reel_id IS NOT NULL;
CREATE INDEX idx_analytics_session ON analytics_events(session_id, ts);
CREATE INDEX idx_analytics_ts ON analytics_events(ts DESC);

-- Partitioning hint: Consider partitioning analytics_events by month for better query performance

-- =====================================
-- AFFILIATIONS
-- =====================================
CREATE INDEX idx_affiliations_code ON affiliations(code) WHERE active = TRUE;
CREATE INDEX idx_affiliations_owner ON affiliations(owner_id);
CREATE INDEX idx_affiliation_clicks_aff ON affiliation_clicks(affiliation_id, clicked_at DESC);
CREATE INDEX idx_affiliation_conversions_aff ON affiliation_conversions(affiliation_id);
CREATE INDEX idx_affiliation_conversions_booking ON affiliation_conversions(booking_id);

-- =====================================
-- TAXONOMIES
-- =====================================
CREATE INDEX idx_amenities_category ON amenities(category);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_experience_amenities_exp ON experience_amenities(experience_id);
CREATE INDEX idx_experience_amenities_key ON experience_amenities(amenity_key);
CREATE INDEX idx_experience_services_inc_exp ON experience_services_included(experience_id);
CREATE INDEX idx_experience_services_exc_exp ON experience_services_excluded(experience_id);

