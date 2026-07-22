import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuideItemRow, GuideItemSearchResult } from "@/types/guide-items";
import type { Database, Json } from "@/types/supabase";

const GUIDE_ITEM_ENRICH_SELECT =
  "id, author_name, author_avatar_url, agence_name, contact_email, contact_phones, source_platforms, reviews, metadata, payment_i18n, menu_image_urls";

const GUIDE_ITEM_FALLBACK_SELECT =
  "id, slug, kind_slug, subtype, city_slug, title_i18n, summary_i18n, description_i18n, payment_i18n, important_notes_i18n, address_text, lat, lng, author_name, author_avatar_url, hero_image_url, gallery_urls, video_url, video_gallery_url, rating_avg, reviews_count, price_range, currency, tags, source_url, verified, status, agence_name, contact_email, contact_phones, source_platforms, reviews, metadata, menu_image_urls, updated_at";

type GuideItemSearchClient = SupabaseClient<Database>;

interface SearchGuideItemsParams {
  queryEmbedding: number[] | null;
  textQuery: string | null;
  citySlug: string | null;
  kinds: string[] | null;
  limit: number;
  minSimilarity: number;
  includeUnpublished: boolean;
}

interface GuideItemSearchCandidate {
  row: GuideItemRow;
  updated_at: string;
  relevance_score: number | null;
}

export type GuideItemNameMatchStatus = "found" | "ambiguous" | "not_found";

export interface SearchGuideItemsByNameResult {
  status: GuideItemNameMatchStatus;
  results: GuideItemSearchResult[];
}

export interface SearchGuideItemsResult {
  results: GuideItemSearchResult[];
  usedFallback: boolean;
}

const CITY_SLUG_ALIASES: Record<string, string> = {
  casa: "casablanca",
  chaouen: "chefchaouen",
  chefchaoun: "chefchaouen",
  fes: "fez",
  fez: "fez",
  marakech: "marrakech",
  marrakeche: "marrakech",
  marrakesh: "marrakech",
  marrekch: "marrakech",
  souira: "essaouira",
  tanger: "tangier",
  tanja: "tangier",
};

export function normalizeGuideItemCitySlug(
  value: string | null,
): string | null {
  if (!value) return null;

  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return CITY_SLUG_ALIASES[slug] ?? slug;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asJsonObject(value: unknown): Json | null {
  return asPlainObject(value) as Json | null;
}

function flattenJsonText(value: Json | null | undefined): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  return Object.values(value)
    .filter((entry): entry is string => typeof entry === "string")
    .join(" ");
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocalizedTitleText(row: GuideItemRow): string {
  return flattenJsonText(row.title_i18n);
}

function scoreGuideItemName(row: GuideItemRow, name: string): number {
  const normalizedName = normalizeSearchText(name);
  const normalizedTitle = normalizeSearchText(getLocalizedTitleText(row));
  const normalizedSlug = normalizeSearchText(row.slug);

  if (!normalizedName || (!normalizedTitle && !normalizedSlug)) return 0;
  if (normalizedTitle === normalizedName) return 1;
  if (normalizedTitle.startsWith(`${normalizedName} `)) return 0.97;
  if (normalizedTitle.includes(normalizedName)) return 0.95;
  if (normalizedSlug.startsWith(`${normalizedName} `)) return 0.93;
  if (normalizedSlug.includes(normalizedName)) return 0.91;

  const nameTokens = tokenize(normalizedName);
  if (nameTokens.length === 0) return 0;

  const titleTokens = new Set(tokenize(normalizedTitle));
  const slugTokens = new Set(tokenize(normalizedSlug));
  const titleMatches = nameTokens.filter((token) =>
    titleTokens.has(token),
  ).length;
  const slugMatches = nameTokens.filter((token) =>
    slugTokens.has(token),
  ).length;
  const bestTokenRatio =
    Math.max(titleMatches, slugMatches) / nameTokens.length;

  return bestTokenRatio === 1 ? 0.88 : 0;
}

function tokenize(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 1);
}

function buildGuideItemSearchText(row: GuideItemRow): string {
  return [
    flattenJsonText(row.title_i18n),
    flattenJsonText(row.summary_i18n),
    flattenJsonText(row.description_i18n),
    flattenJsonText(row.payment_i18n),
    row.address_text ?? "",
    row.author_name ?? "",
    row.agence_name ?? "",
    row.subtype ?? "",
    row.tags.join(" "),
    row.source_platforms.join(" "),
  ]
    .join(" ")
    .trim();
}

function scoreGuideItem(
  row: GuideItemRow,
  textQuery: string | null,
): number | null {
  if (!textQuery) return null;

  const normalizedQuery = normalizeSearchText(textQuery);
  if (!normalizedQuery) return null;

  const queryTokens = tokenize(textQuery);
  if (queryTokens.length === 0) return null;

  const haystack = buildGuideItemSearchText(row);
  const normalizedHaystack = normalizeSearchText(haystack);
  if (!normalizedHaystack) return 0;

  const haystackTokens = new Set(tokenize(haystack));
  const matches = queryTokens.filter((token) =>
    haystackTokens.has(token),
  ).length;
  const tokenScore = matches / queryTokens.length;
  const phraseBoost = normalizedHaystack.includes(normalizedQuery) ? 0.35 : 0;

  return Number((tokenScore + phraseBoost).toFixed(4));
}

function toGuideItemSearchResult(
  row: GuideItemRow,
  relevanceScore: number | null,
): GuideItemSearchResult {
  return {
    id: row.id,
    slug: row.slug,
    kind_slug: row.kind_slug,
    subtype: row.subtype,
    city_slug: row.city_slug,
    title_i18n: row.title_i18n,
    summary_i18n: row.summary_i18n,
    description_i18n: row.description_i18n,
    payment_i18n: row.payment_i18n,
    important_notes_i18n: row.important_notes_i18n,
    address_text: row.address_text,
    lat: row.lat,
    lng: row.lng,
    author_name: row.author_name,
    author_avatar_url: row.author_avatar_url,
    hero_image_url: row.hero_image_url,
    gallery_urls: row.gallery_urls,
    video_url: row.video_url,
    video_gallery_url: row.video_gallery_url,
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    price_range: row.price_range,
    currency: row.currency,
    tags: row.tags,
    source_url: row.source_url,
    verified: row.verified,
    status: row.status,
    semantic_score: null,
    text_rank: relevanceScore,
    relevance_score: relevanceScore,
    agence_name: row.agence_name,
    contact_email: row.contact_email,
    contact_phones: row.contact_phones,
    source_platforms: row.source_platforms,
    reviews: row.reviews,
    metadata: asPlainObject(row.metadata),
    menu_image_urls: row.menu_image_urls,
  };
}

async function enrichGuideItemResults(
  supabase: GuideItemSearchClient,
  results: GuideItemSearchResult[],
): Promise<GuideItemSearchResult[]> {
  if (results.length === 0) return results;

  const { data: guideItemRows, error } = await supabase
    .from("guide_items")
    .select(GUIDE_ITEM_ENRICH_SELECT)
    .in(
      "id",
      results.map((result) => result.id),
    );

  if (error || !guideItemRows) {
    if (error) {
      console.warn("Guide item enrichment query failed:", error);
    }
    return results;
  }

  const guideItemById = new Map(
    (
      guideItemRows as Array<
        Record<string, unknown> & {
          id: string;
        }
      >
    ).map((row) => [row.id, row] as const),
  );

  return results.map((result) => {
    const guideItem = guideItemById.get(result.id);
    if (!guideItem) return result;

    return {
      ...result,
      author_name:
        typeof guideItem.author_name === "string"
          ? guideItem.author_name
          : null,
      author_avatar_url:
        typeof guideItem.author_avatar_url === "string"
          ? guideItem.author_avatar_url
          : null,
      agence_name:
        typeof guideItem.agence_name === "string"
          ? guideItem.agence_name
          : null,
      contact_email:
        typeof guideItem.contact_email === "string"
          ? guideItem.contact_email
          : null,
      contact_phones: asStringArray(guideItem.contact_phones),
      source_platforms: asStringArray(guideItem.source_platforms),
      reviews: Array.isArray(guideItem.reviews) ? guideItem.reviews : [],
      metadata: asPlainObject(guideItem.metadata),
      payment_i18n: asJsonObject(guideItem.payment_i18n),
      menu_image_urls: asStringArray(guideItem.menu_image_urls),
    };
  });
}

async function fallbackGuideItemSearch(
  supabase: GuideItemSearchClient,
  params: SearchGuideItemsParams,
): Promise<GuideItemSearchResult[]> {
  const citySlug = normalizeGuideItemCitySlug(params.citySlug);

  let query = supabase
    .from("guide_items")
    .select(GUIDE_ITEM_FALLBACK_SELECT)
    .is("deleted_at", null);

  if (!params.includeUnpublished) {
    query = query.eq("status", "published");
  }

  if (citySlug) {
    query = query.eq("city_slug", citySlug);
  }

  if (params.kinds && params.kinds.length > 0) {
    query = query.in("kind_slug", params.kinds);
  }

  const fetchLimit = Math.min(Math.max(params.limit * 5, 20), 60);
  const { data, error } = await query.limit(fetchLimit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<GuideItemRow & { updated_at: string }>;
  const candidates: GuideItemSearchCandidate[] = rows.map((row) => ({
    row,
    updated_at: row.updated_at,
    relevance_score: scoreGuideItem(row, params.textQuery),
  }));

  let filteredCandidates = candidates;
  if (params.textQuery) {
    const matchedCandidates = candidates.filter(
      (candidate) => (candidate.relevance_score ?? 0) > 0,
    );

    filteredCandidates =
      matchedCandidates.length > 0
        ? matchedCandidates
        : citySlug || (params.kinds?.length ?? 0) > 0
          ? candidates
          : [];
  }

  return filteredCandidates
    .sort((left, right) => {
      const leftScore = left.relevance_score ?? -1;
      const rightScore = right.relevance_score ?? -1;
      if (rightScore !== leftScore) return rightScore - leftScore;
      if (right.row.reviews_count !== left.row.reviews_count) {
        return right.row.reviews_count - left.row.reviews_count;
      }
      if ((right.row.rating_avg ?? -1) !== (left.row.rating_avg ?? -1)) {
        return (right.row.rating_avg ?? -1) - (left.row.rating_avg ?? -1);
      }
      return (
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime()
      );
    })
    .slice(0, params.limit)
    .map((candidate) =>
      toGuideItemSearchResult(candidate.row, candidate.relevance_score),
    );
}

export async function searchGuideItemsByName(
  supabase: GuideItemSearchClient,
  params: {
    name: string;
    citySlug: string | null;
    limit: number;
  },
): Promise<SearchGuideItemsByNameResult> {
  const normalizedName = normalizeSearchText(params.name);
  if (!normalizedName) {
    return { status: "not_found", results: [] };
  }

  const citySlug = normalizeGuideItemCitySlug(params.citySlug);
  let query = supabase
    .from("guide_items")
    .select(GUIDE_ITEM_FALLBACK_SELECT)
    .eq("status", "published")
    .is("deleted_at", null);

  if (citySlug) {
    query = query.eq("city_slug", citySlug);
  }

  const { data, error } = await query.limit(1000);
  if (error) {
    throw new Error(error.message);
  }

  const candidates = (
    (data ?? []) as Array<GuideItemRow & { updated_at: string }>
  )
    .map((row) => ({ row, score: scoreGuideItemName(row, params.name) }))
    .filter((candidate) => candidate.score >= 0.88)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.row.verified !== left.row.verified) {
        return Number(right.row.verified) - Number(left.row.verified);
      }
      if (right.row.reviews_count !== left.row.reviews_count) {
        return right.row.reviews_count - left.row.reviews_count;
      }
      return (right.row.rating_avg ?? -1) - (left.row.rating_avg ?? -1);
    });

  if (candidates.length === 0) {
    return { status: "not_found", results: [] };
  }

  const topScore = candidates[0].score;
  const equallyStrongCandidates = candidates.filter(
    (candidate) => topScore - candidate.score <= 0.02,
  );
  const status: GuideItemNameMatchStatus =
    equallyStrongCandidates.length > 1 ? "ambiguous" : "found";
  const selected =
    status === "ambiguous" ? equallyStrongCandidates : candidates.slice(0, 1);

  return {
    status,
    results: selected
      .slice(0, params.limit)
      .map((candidate) =>
        toGuideItemSearchResult(candidate.row, candidate.score),
      ),
  };
}

export async function searchGuideItemsWithFallback(
  supabase: GuideItemSearchClient,
  params: SearchGuideItemsParams,
): Promise<SearchGuideItemsResult> {
  const citySlug = normalizeGuideItemCitySlug(params.citySlug);

  const { data, error } = await supabase.rpc("search_guide_items", {
    p_query_embedding: params.queryEmbedding
      ? JSON.stringify(params.queryEmbedding)
      : null,
    p_text_query: params.textQuery,
    p_city_slug: citySlug,
    p_kinds: params.kinds,
    p_limit: params.limit,
    p_min_similarity: params.minSimilarity,
    p_include_unpublished: params.includeUnpublished,
  });

  if (!error) {
    const results = await enrichGuideItemResults(
      supabase,
      (data ?? []) as GuideItemSearchResult[],
    );

    if (results.length > 0) {
      if (results.length >= params.limit) {
        return {
          results,
          usedFallback: false,
        };
      }

      // Top up partial semantic results with the text fallback so
      // callers receive up to `limit` candidates when the catalog has them.
      if (citySlug || (params.kinds?.length ?? 0) > 0) {
        const seenIds = new Set(results.map((result) => result.id));
        const fallbackResults = await fallbackGuideItemSearch(supabase, {
          ...params,
          citySlug,
        });
        const topUp = fallbackResults.filter(
          (result) => !seenIds.has(result.id),
        );

        if (topUp.length > 0) {
          return {
            results: [...results, ...topUp].slice(0, params.limit),
            usedFallback: true,
          };
        }
      }

      return {
        results,
        usedFallback: false,
      };
    }

    if (citySlug || (params.kinds?.length ?? 0) > 0) {
      const fallbackResults = await fallbackGuideItemSearch(supabase, {
        ...params,
        citySlug,
      });

      return {
        results: fallbackResults,
        usedFallback: true,
      };
    }

    return {
      results: [],
      usedFallback: false,
    };
  }

  console.warn("search_guide_items RPC failed, using fallback search:", error);

  const results = await fallbackGuideItemSearch(supabase, params);

  return {
    results,
    usedFallback: true,
  };
}
