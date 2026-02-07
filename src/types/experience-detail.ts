import type { Database } from '@/types/supabase';

type ExperienceRow = Database['public']['Tables']['experiences']['Row'];
type HostRow = Database['public']['Tables']['hosts']['Row'];
type MediaAssetRow = Database['public']['Tables']['media_assets']['Row'];
type LodgingRoomRow = Database['public']['Tables']['lodging_room_types']['Row'];
type TripRow = Database['public']['Tables']['experiences_trip']['Row'];
type TripItineraryRow = Database['public']['Tables']['trip_itinerary']['Row'];
type TripDepartureRow = Database['public']['Tables']['trip_departures']['Row'];

export type ExperienceMediaRecord = {
  id: string;
  role: Database['public']['Enums']['media_role'];
  caption: string | null;
  order_index: number | null;
  asset: MediaAssetRow | null;
};

export type ExperienceAmenityRecord = {
  amenity_key: string;
  amenity:
    | {
        key: string;
        label_en: string | null;
        label_fr: string | null;
        icon: string | null;
        category: string;
      }
    | null;
};

export type ExperienceServiceRecord = {
  service_key: string;
  notes: string | null;
  service:
    | {
        key: string;
        label_en: string | null;
        label_fr: string | null;
        icon: string | null;
        category: string;
      }
    | null;
};

export type ExperienceLodgingRecord = {
  lodging_type: Database['public']['Enums']['lodging_type'];
  non_fumeur: boolean | null;
  animaux_acceptes: boolean | null;
  check_in_time: string | null;
  check_out_time: string | null;
  min_stay_nights: number | null;
  house_rules: string | null;
};

export type SupabaseExperienceRecord = ExperienceRow & {
  country: string | null;
  host: HostRow | null;
  video: MediaAssetRow | null;
  media: ExperienceMediaRecord[] | null;
  amenities: ExperienceAmenityRecord[] | null;
  rooms: LodgingRoomRow[] | null;
  lodging: ExperienceLodgingRecord | ExperienceLodgingRecord[] | null;
  trip: TripRow | TripRow[] | null;
  itinerary: TripItineraryRow | TripItineraryRow[] | null;
  departures: TripDepartureRow | TripDepartureRow[] | null;
  servicesIncluded: ExperienceServiceRecord[] | null;
  servicesExcluded: ExperienceServiceRecord[] | null;
};

export type ExperienceMedia = {
  id: string;
  role: Database['public']['Enums']['media_role'] | null;
  kind: Database['public']['Enums']['media_kind'];
  caption: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  durationSeconds: number | null;
};

export type ExperienceHost = {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  avgRating: number | null;
  totalExperiences: number | null;
  totalBookings: number | null;
  verified: boolean | null;
  responseTimeHours: number | null;
  responseRate: number | null;
};

export type ExperienceRoom = LodgingRoomRow & {
  photoUrls: string[];
  itemKeys: string[];
};

export type ExperienceLodging = ExperienceLodgingRecord & {
  rooms: ExperienceRoom[];
};

export type ExperienceTrip = TripRow & {
  itinerary: TripItineraryRow[];
  departures: TripDepartureRow[];
  price_per_person: number;
  price_currency: string;
};

export type ExperienceService = {
  key: string;
  label: string;
  icon: string | null;
  category: string;
  notes: string | null;
  type: 'included' | 'excluded'; // Added to distinguish in unified lists
};

export type ExperienceAmenity = {
  key: string;
  label: string;
  icon: string | null;
  category: string;
};

export type ExperienceDetail = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  city: string;
  region: string | null;
  country: string | null;
  address: Record<string, unknown> | null;
  type: Database['public']['Enums']['experience_type'];
  tags: string[];
  languages: string[];
  cancellationPolicy: Database['public']['Enums']['cancellation_policy'];
  thumbnailUrl: string | null;
  video: ExperienceMedia | null;
  gallery: ExperienceMedia[];
  metrics: {
    reviews: number;
    rating: number | null;
    bookings: number;
    saves: number;
    views: number;
  };
  host: ExperienceHost | null;
  lodging: ExperienceLodging | null;
  trip: ExperienceTrip | null;
  amenities: ExperienceAmenity[];
  servicesIncluded: ExperienceService[];
  servicesExcluded: ExperienceService[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
