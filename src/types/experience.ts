export type ExperienceType = 'trip' | 'lodging' | 'activity';

export interface ExperienceListItem {
  id: string;
  title: string;
  short_description: string;
  city: string;
  region: string | null;
  type: ExperienceType;
  thumbnail_url: string | null;
  avg_rating: number | null;
  reviews_count: number | null;
  host: {
    id: string;
    name: string;
    avatar_url: string | null;
    verified: boolean | null;
  } | null;
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
  | 'newest'
  | 'popular'
  | 'rating'
  | 'price_high'
  | 'price_low';
