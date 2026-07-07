import { type AppLocale, getLocalizedI18nValue } from "@/lib/i18n";
import type {
  GuideItemChatCardData,
  GuideItemReview,
  GuideItemRow,
  GuideItemSearchResult,
} from "@/types/guide-items";

function isGuideItemReview(value: unknown): value is GuideItemReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const review = value as Record<string, unknown>;
  return (
    typeof review.name === "string" &&
    typeof review.content === "string" &&
    typeof review.created_at === "string" &&
    typeof review.source === "string"
  );
}

export function mapGuideItemSearchRowToChatCardData(
  row: GuideItemSearchResult,
  locale: AppLocale,
): GuideItemChatCardData {
  return {
    id: row.id,
    slug: row.slug,
    kind_slug: row.kind_slug as GuideItemChatCardData["kind_slug"],
    subtype: row.subtype,
    city_slug: row.city_slug,
    title: getLocalizedI18nValue(row.title_i18n, locale),
    summary: getLocalizedI18nValue(row.summary_i18n, locale),
    description: getLocalizedI18nValue(row.description_i18n, locale),
    payment: getLocalizedI18nValue(row.payment_i18n, locale),
    address_text: row.address_text,
    lat: row.lat,
    lng: row.lng,
    author_name: row.author_name,
    author_avatar_url: row.author_avatar_url,
    agence_name: row.agence_name,
    contact_email: row.contact_email,
    contact_phones: row.contact_phones ?? [],
    hero_image_url: row.hero_image_url,
    gallery_urls: row.gallery_urls,
    menu_image_urls: row.menu_image_urls ?? [],
    video_url: row.video_url,
    video_gallery_url: row.video_gallery_url,
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    price_range: row.price_range,
    currency: row.currency,
    tags: row.tags,
    source_platforms: row.source_platforms ?? [],
    source_url: row.source_url,
    verified: row.verified,
    reviews: Array.isArray(row.reviews)
      ? row.reviews.filter(isGuideItemReview)
      : [],
    metadata: row.metadata ?? null,
  };
}

export function mapGuideItemRowToChatCardData(
  row: GuideItemRow,
  locale: AppLocale,
): GuideItemChatCardData {
  return {
    id: row.id,
    slug: row.slug,
    kind_slug: row.kind_slug as GuideItemChatCardData["kind_slug"],
    subtype: row.subtype,
    city_slug: row.city_slug,
    title: getLocalizedI18nValue(row.title_i18n, locale),
    summary: getLocalizedI18nValue(row.summary_i18n, locale),
    description: getLocalizedI18nValue(row.description_i18n, locale),
    payment: getLocalizedI18nValue(row.payment_i18n, locale),
    address_text: row.address_text,
    lat: row.lat,
    lng: row.lng,
    author_name: row.author_name,
    author_avatar_url: row.author_avatar_url,
    agence_name: row.agence_name,
    contact_email: row.contact_email,
    contact_phones: row.contact_phones ?? [],
    hero_image_url: row.hero_image_url,
    gallery_urls: row.gallery_urls,
    menu_image_urls: row.menu_image_urls ?? [],
    video_url: row.video_url,
    video_gallery_url: row.video_gallery_url,
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    price_range: row.price_range,
    currency: row.currency,
    tags: row.tags,
    source_platforms: row.source_platforms ?? [],
    source_url: row.source_url,
    verified: row.verified,
    reviews: Array.isArray(row.reviews)
      ? (row.reviews as unknown[]).filter(isGuideItemReview)
      : [],
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}
