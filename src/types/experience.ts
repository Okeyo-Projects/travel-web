export type ExperienceType = "trip" | "lodging" | "activity";

export interface ExperienceListItem {
  id: string;
  title: string;
  slug: string | null;
  short_description: string;
  short_description_en: string | null;
  short_description_fr: string | null;
  short_description_ar: string | null;
  city: string;
  region: string | null;
  city_linked: {
    name: string;
    region: string | null;
    slug: string;
  } | null;
  type: ExperienceType;
  thumbnail_url: string | null;
  video_url?: string | null;
  video_hls_url?: string | null;
  avg_rating: number | null;
  reviews_count: number | null;
  host: {
    id: string;
    name: string;
    avatar_url: string | null;
    verified: boolean | null;
  } | null;
  rooms?: {
    id: string;
    name: string | null;
    price_cents: number | null;
    currency: string | null;
    max_persons: number | null;
    total_rooms: number | null;
    photo_urls: string[];
  }[];
  trip: {
    price_cents: number | null;
    currency: string | null;
    duration_days: number | null;
    duration_hours: number | null;
  } | null;
  lodging: {
    min_stay_nights: number | null;
    price_cents: number | null;
    currency: string | null;
  } | null;
  highlighted_title?: string;
  highlighted_description?: string;
  relevance_score?: number;
}

export type ExperienceSort =
  | "newest"
  | "popular"
  | "rating"
  | "price_high"
  | "price_low";
