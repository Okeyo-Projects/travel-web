-- Create ENUM types

-- Profile and Host status
CREATE TYPE profile_status AS ENUM ('active', 'suspended');
CREATE TYPE host_status AS ENUM ('active', 'paused', 'suspended');

-- Experience types
CREATE TYPE experience_type AS ENUM ('lodging', 'trip', 'activity');
CREATE TYPE experience_status AS ENUM ('draft', 'review', 'published', 'paused', 'rejected');
CREATE TYPE cancellation_policy AS ENUM ('free', 'flexible', 'moderate', 'strict', 'non_refundable');

-- Lodging types
CREATE TYPE lodging_type AS ENUM (
  'auberge_de_jeunesse',
  'maison_d_hotes',
  'riad',
  'ecolodge',
  'hotel',
  'camping',
  'autre'
);

CREATE TYPE room_type AS ENUM (
  'dortoir_mixte',
  'dortoir_femmes',
  'chambre_privee',
  'suite',
  'bungalow',
  'tente'
);

-- Trip types
CREATE TYPE trip_category AS ENUM (
  'journee',
  'randonnee',
  'circuit',
  'outdoor',
  'culturel',
  'aventure',
  'sport',
  'gastronomie'
);

CREATE TYPE skill_level AS ENUM ('debutant', 'intermediaire', 'confirme', 'expert');

-- Media types
CREATE TYPE media_kind AS ENUM ('video', 'photo');
CREATE TYPE media_role AS ENUM ('photo');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE reel_visibility AS ENUM ('public', 'unlisted', 'private');

-- Booking and Payment
CREATE TYPE booking_status AS ENUM (
  'draft',
  'pending_payment',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded'
);

-- Social
CREATE TYPE like_target_type AS ENUM ('experience', 'review');
CREATE TYPE following_type AS ENUM ('user', 'host');
CREATE TYPE notification_kind AS ENUM (
  'booking_request',
  'booking_confirmed',
  'booking_cancelled',
  'payment_succeeded',
  'new_message',
  'new_review',
  'review_response',
  'experience_published',
  'follow',
  'like',
  'system'
);

