import type { Database } from "./supabase";

export type GuideItemStatus = "draft" | "published" | "archived";

export type GuideItemKind =
  | "restaurant"
  | "transport"
  | "wellness"
  | "shopping"
  | "museum"
  | "activity"
  | "other";

export interface GuideItemReview {
  name: string;
  user_image: string | null;
  note: number | null;
  content: string;
  created_at: string;
  source: string;
  tags?: string[];
}

export type GuideItemSearchRow =
  Database["public"]["Functions"]["search_guide_items"]["Returns"][number];

export interface GuideItemSearchResult extends GuideItemSearchRow {
  agence_name?: string | null;
  contact_email?: string | null;
  contact_phones?: string[];
  source_platforms?: string[];
  reviews?: unknown;
  metadata?: Record<string, unknown> | null;
  menu_image_urls?: string[];
}

export type GuideItemRow = Database["public"]["Tables"]["guide_items"]["Row"];

export interface GuideItemChatCardData {
  id: string;
  slug: string;
  kind_slug: GuideItemKind;
  subtype: string | null;
  city_slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  address_text?: string | null;
  lat?: number | null;
  lng?: number | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
  agence_name?: string | null;
  contact_email?: string | null;
  contact_phones?: string[];
  hero_image_url?: string | null;
  gallery_urls: string[];
  menu_image_urls?: string[];
  video_url?: string | null;
  video_gallery_url: string[];
  rating_avg?: number | null;
  reviews_count: number;
  price_range?: string | null;
  currency: string;
  payment?: string | null;
  tags: string[];
  source_platforms?: string[];
  source_url?: string | null;
  verified: boolean;
  reviews?: GuideItemReview[];
  metadata?: Record<string, unknown> | null;
}

export interface GuideItemSearchFilters {
  query?: string;
  citySlug?: string;
  kinds?: GuideItemKind[];
  limit?: number;
  minSimilarity?: number;
}

export interface GuideItemSearchResponse {
  results: GuideItemSearchResult[];
}
