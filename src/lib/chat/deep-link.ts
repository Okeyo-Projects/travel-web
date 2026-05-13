import { type AppLocale, isSupportedLocale } from "@/lib/i18n";

export const CHAT_DEEP_LINK_BOOTSTRAP_MESSAGE = "__OKEYO_DEEPLINK_BOOT__";

type SearchParamValue = string | string[] | undefined;

export type ChatDeepLinkSourceParam = "experience" | "property";

export interface ChatDeepLinkParams {
  identifier: string;
  sourceParam: ChatDeepLinkSourceParam;
  requestedLanguage: AppLocale | null;
  promo: string | null;
  checkin: string | null;
  nights: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface ResolvedChatDeepLinkExperience {
  id: string;
  slug: string | null;
  title: string;
  type: "lodging" | "trip" | "activity";
  city: string;
  region: string | null;
  country: string | null;
  description: string;
  priceMad: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  thumbnailUrl: string | null;
  videoUrl: string | null;
  videoHlsUrl: string | null;
  gallery: string[];
  hostName: string | null;
  rooms: Array<{
    id: string;
    name: string;
    type: string | null;
    priceMad: number | null;
    capacityBeds: number | null;
    maxPersons: number | null;
    photos: string[];
  }>;
}

export interface ActiveChatDeepLink extends ChatDeepLinkParams {
  experience: ResolvedChatDeepLinkExperience;
}

export interface ChatDeepLinkRequestBody {
  experienceId: string;
  experienceSlug: string | null;
  promo: string | null;
  checkin: string | null;
  nights: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export type ChatDeepLinkReplyType = "booking_intent" | "more_info" | "other";

export function getFirstSearchParamValue(
  value: SearchParamValue,
): string | null {
  if (Array.isArray(value)) {
    const firstValue = value.find(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    return firstValue?.trim() ?? null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function normalizeDateParam(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeNights(value: string | null): number | null {
  if (!value) return null;

  const nights = Number.parseInt(value, 10);
  if (!Number.isFinite(nights) || nights <= 0) {
    return null;
  }

  return Math.min(nights, 30);
}

export function parseChatDeepLinkSearchParams(searchParams: {
  experience?: SearchParamValue;
  property?: SearchParamValue;
  lang?: SearchParamValue;
  promo?: SearchParamValue;
  checkin?: SearchParamValue;
  nights?: SearchParamValue;
  utm_source?: SearchParamValue;
  utm_medium?: SearchParamValue;
  utm_campaign?: SearchParamValue;
}): ChatDeepLinkParams | null {
  const experienceIdentifier = getFirstSearchParamValue(
    searchParams.experience,
  );
  const propertyIdentifier = getFirstSearchParamValue(searchParams.property);
  const identifier = experienceIdentifier ?? propertyIdentifier;

  if (!identifier) {
    return null;
  }

  const requestedLanguageRaw = getFirstSearchParamValue(searchParams.lang)
    ?.trim()
    .toLowerCase();
  const requestedLanguage =
    requestedLanguageRaw && isSupportedLocale(requestedLanguageRaw)
      ? requestedLanguageRaw
      : null;

  return {
    identifier,
    sourceParam: experienceIdentifier ? "experience" : "property",
    requestedLanguage,
    promo: getFirstSearchParamValue(searchParams.promo),
    checkin: normalizeDateParam(getFirstSearchParamValue(searchParams.checkin)),
    nights: normalizeNights(getFirstSearchParamValue(searchParams.nights)),
    utmSource: getFirstSearchParamValue(searchParams.utm_source),
    utmMedium: getFirstSearchParamValue(searchParams.utm_medium),
    utmCampaign: getFirstSearchParamValue(searchParams.utm_campaign),
  };
}

export function buildChatDeepLinkRequest(
  deepLink: ActiveChatDeepLink,
): ChatDeepLinkRequestBody {
  return {
    experienceId: deepLink.experience.id,
    experienceSlug: deepLink.experience.slug,
    promo: deepLink.promo,
    checkin: deepLink.checkin,
    nights: deepLink.nights,
    utmSource: deepLink.utmSource,
    utmMedium: deepLink.utmMedium,
    utmCampaign: deepLink.utmCampaign,
  };
}

export function isChatDeepLinkBootstrapText(text: string | null | undefined) {
  return text?.trim() === CHAT_DEEP_LINK_BOOTSTRAP_MESSAGE;
}

export function classifyChatDeepLinkReply(text: string): ChatDeepLinkReplyType {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return "other";
  }

  const bookingPatterns = [
    /\b(book|booking|reserve|reservation|yes|yeah|yep|confirm)\b/i,
    /\b(reserver|reservation|réserver|oui|ok|d'accord|dates?)\b/i,
    /(^|[\s،,.!?])نعم($|[\s،,.!?])/i,
    /(^|[\s،,.!?])احجز($|[\s،,.!?])/i,
    /(^|[\s،,.!?])حجز($|[\s،,.!?])/i,
    /\b20\d{2}-\d{2}-\d{2}\b/,
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/,
  ];

  if (bookingPatterns.some((pattern) => pattern.test(normalized))) {
    return "booking_intent";
  }

  const infoPatterns = [
    /\b(more|info|information|details|photos?|pictures?)\b/i,
    /\b(plus|infos?|information|détails?|photos?)\b/i,
    /(معلومات|تفاصيل|صور|المزيد)/i,
  ];

  if (infoPatterns.some((pattern) => pattern.test(normalized))) {
    return "more_info";
  }

  return "other";
}
