import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { createClient } from "@/lib/supabase/server";
import { getImageUrl } from "@/utils/functions";

const searchExperiencesSchema = z.object({
  query: z.string().describe("Search query from user in natural language"),
  type: z
    .enum(["lodging", "trip", "activity"])
    .optional()
    .describe(
      'Filter by catalog type only when the user explicitly asks for lodging, a trip/excursion, or an activity. Do not set this just because the user says generic "experience(s)" or "options".',
    ),
  city: z
    .string()
    .optional()
    .describe('Filter by city name (e.g., "Marrakech", "Chefchaouen")'),
  region: z
    .string()
    .optional()
    .describe(
      'Filter by stored administrative region (e.g., "Marrakech-Safi", "Tanger-Tétouan-Al Hoceïma"). Do not put local areas like "Imlil", "Ouirgane", or "Lala Takerkousst" here; keep them in the natural-language query with city="Marrakech".',
    ),
  max_price_mad: z
    .number()
    .optional()
    .describe("Maximum price in MAD (Moroccan Dirham)"),
  min_rating: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Minimum average rating (0-5)"),
  guests: z.number().optional().describe("Number of lodging guests"),
  date_from: z
    .string()
    .optional()
    .describe("Check-in date (YYYY-MM-DD format)"),
  date_to: z
    .string()
    .optional()
    .describe("Check-out date (YYYY-MM-DD format, for lodging)"),
  user_lat: z
    .number()
    .optional()
    .describe("User latitude for distance-based search"),
  user_lng: z
    .number()
    .optional()
    .describe("User longitude for distance-based search"),
  max_distance_km: z
    .number()
    .optional()
    .describe("Maximum distance in kilometers from user location"),
  sort_by_distance: z
    .boolean()
    .optional()
    .describe("Sort results by distance from user"),
  only_with_promo: z
    .boolean()
    .optional()
    .describe("Only show experiences with active promotions"),
  only_auto_apply: z
    .boolean()
    .optional()
    .describe("Only show experiences with auto-apply promotions"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
  allow_location_fallback: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Only true after the user explicitly agrees to see alternatives outside the requested city/region.",
    ),
});

// Common city name variants to handle typos in database
const CITY_VARIANTS: Record<string, string[]> = {
  marrakech: ["marrakech", "marakech", "marrekch", "marrakesh", "marrakeche"],
  casablanca: ["casablanca", "casa"],
  chefchaouen: ["chefchaouen", "chefchaoun", "chaouen"],
  fès: ["fès", "fes", "fez"],
  tangier: ["tangier", "tanger", "tanja"],
  rabat: ["rabat"],
  agadir: ["agadir"],
  essaouira: ["essaouira", "souira"],
};

/**
 * Normalize a city name to handle typos and variants.
 * Returns the canonical name if found, or the original trimmed name.
 */
function normalizeCity(city: string): string {
  const lower = city.trim().toLowerCase();
  for (const [canonical, variants] of Object.entries(CITY_VARIANTS)) {
    if (variants.includes(lower)) {
      // Return the proper cased canonical name
      return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    }
  }
  return city.trim();
}

/**
 * Get all variant spellings for a city name to match against DB typos.
 */
function getCityVariants(city: string): string[] {
  const lower = city.trim().toLowerCase();
  for (const [, variants] of Object.entries(CITY_VARIANTS)) {
    if (variants.includes(lower)) {
      return variants;
    }
  }
  return [lower];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }

  return output;
}

function buildLocationCandidates(value?: string): string[] {
  if (!value) return [];

  return uniqueStrings([
    value,
    normalizeCity(value),
    ...getCityVariants(value),
  ]).slice(0, 12);
}

const TYPE_HINT_PATTERNS: Record<
  NonNullable<z.infer<typeof searchExperiencesSchema>["type"]>,
  RegExp
> = {
  lodging:
    /\b(riad|auberge|gite|hebergement|hotel|lodge|maison d[' ]hotes|chambre|dormir|sejour|nuit|room|stay)\b/i,
  trip: /\b(trek|randonnee|excursion|circuit|tour|visite guidee|guide|depart|trip)\b/i,
  activity:
    /\b(activite|atelier|cours|cuisine|workshop|class|surf|quad|balade)\b/i,
};

const BROAD_CATALOG_QUERY_PATTERN =
  /\b(experience|experiences|option|options|idee|idees|quoi faire|choses a faire|things to do|what to do)\b/i;

const EXPERIENCE_NAME_HINT_PATTERN =
  /\b(riad|auberge|kasbah|dar|lodge|maison|villa|camp|hotel|hôtel)\b/i;

const EXPERIENCE_NAME_INTENT_PATTERN =
  /\b(visiter|voir|montrer|details|détails|reserver|réserver|book|visit|show)\b/i;

const GENERIC_NAME_QUERY_TOKENS = new Set([
  "auberge",
  "book",
  "cette",
  "dar",
  "details",
  "détails",
  "donne",
  "experience",
  "expérience",
  "hôtel",
  "hotel",
  "kasbah",
  "lodge",
  "maison",
  "montrer",
  "reserve",
  "reserver",
  "réserver",
  "riad",
  "villa",
  "visit",
  "visiter",
  "voir",
  "veux",
]);

function normalizeSearchText(value: string | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shouldRetryWithoutTypeFilter(
  params: z.infer<typeof searchExperiencesSchema>,
): boolean {
  if (!params.type) return false;

  const normalizedQuery = normalizeSearchText(params.query);
  if (!normalizedQuery) return false;
  if (TYPE_HINT_PATTERNS[params.type].test(normalizedQuery)) return false;
  if (
    !params.city &&
    !params.region &&
    /^experience\s+[a-z0-9]+(?:\s|$)/i.test(normalizedQuery)
  ) {
    return false;
  }

  if (BROAD_CATALOG_QUERY_PATTERN.test(normalizedQuery)) return true;

  return Boolean(params.city || params.region);
}

function extractNameQueryTokens(query: string): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return Array.from(
    new Set(
      normalizedQuery
        .split(/\s+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !GENERIC_NAME_QUERY_TOKENS.has(token)),
    ),
  ).slice(0, 8);
}

function looksLikeExperienceNameQuery(query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  if (
    !EXPERIENCE_NAME_HINT_PATTERN.test(normalizedQuery) &&
    !EXPERIENCE_NAME_INTENT_PATTERN.test(normalizedQuery)
  ) {
    return false;
  }

  return extractNameQueryTokens(query).length > 0;
}

function looksLikeSingularExperienceNameQuery(query: string): boolean {
  return /^experience\s+[a-z0-9]+(?:\s|$)/i.test(normalizeSearchText(query));
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length] ?? Number.POSITIVE_INFINITY;
}

function tokenMatchesTitle(token: string, titleTokens: string[]): boolean {
  return titleTokens.some((titleToken) => {
    if (titleToken === token) return true;
    if (token.length >= 4 && titleToken.includes(token)) return true;
    if (titleToken.length >= 4 && token.includes(titleToken)) return true;
    if (Math.min(token.length, titleToken.length) < 4) return false;
    return levenshteinDistance(token, titleToken) <= 1;
  });
}

function scoreTitleMatch(queryTokens: string[], title: string): number {
  const normalizedTitle = normalizeSearchText(title);
  if (!normalizedTitle || queryTokens.length === 0) return 0;

  const titleTokens = normalizedTitle.split(/\s+/);
  const matchedTokens = queryTokens.filter((token) =>
    tokenMatchesTitle(token, titleTokens),
  );

  if (matchedTokens.length === 0) return 0;

  const coverage = matchedTokens.length / queryTokens.length;
  const substringBonus = normalizedTitle.includes(queryTokens.join(" "))
    ? 40
    : 0;
  return coverage * 100 + substringBonus;
}

async function findDirectTitleMatches(
  db: any,
  params: z.infer<typeof searchExperiencesSchema>,
) {
  if (
    !looksLikeExperienceNameQuery(params.query) &&
    !looksLikeSingularExperienceNameQuery(params.query)
  ) {
    return null;
  }

  const queryTokens = extractNameQueryTokens(params.query);
  const cityFilter = normalizeSearchText(params.city);
  const regionFilter = normalizeSearchText(params.region);

  const { data: experiences, error } = await db
    .from("experiences")
    .select(
      "id, title, short_description, type, city, region, avg_rating, reviews_count, thumbnail_url, video_id, host_id",
    )
    .eq("status", "published")
    .not("title", "ilike", "%test%")
    .limit(100);

  if (error || !experiences) return [];

  const scored = experiences
    .filter(
      (experience: any) => !params.type || experience.type === params.type,
    )
    .filter((experience: any) => {
      if (
        cityFilter &&
        normalizeSearchText(experience.city).includes(cityFilter) === false
      ) {
        return false;
      }

      if (
        regionFilter &&
        normalizeSearchText(experience.region).includes(regionFilter) === false
      ) {
        return false;
      }

      return true;
    })
    .map((experience: any) => ({
      experience,
      score: scoreTitleMatch(queryTokens, experience.title || ""),
    }))
    .filter(({ score }: { score: number }) => score >= 70)
    .sort(
      (
        a: { score: number; experience: { title?: string | null } },
        b: { score: number; experience: { title?: string | null } },
      ) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.experience.title || "").localeCompare(
          b.experience.title || "",
        );
      },
    )
    .slice(0, params.limit || 4);

  if (scored.length === 0) return [];

  const experienceIds = scored.map(({ experience }: any) => experience.id);
  const hostIds = scored
    .map(({ experience }: any) => experience.host_id)
    .filter(Boolean);

  const [{ data: hosts }, { data: lodgingPrices }, { data: tripPrices }] =
    await Promise.all([
      hostIds.length
        ? db.from("hosts").select("id, name").in("id", hostIds)
        : Promise.resolve({ data: [] }),
      db
        .from("lodging_room_types")
        .select("experience_id, price_cents")
        .in("experience_id", experienceIds)
        .is("deleted_at", null),
      db
        .from("experiences_trip")
        .select("experience_id, price_cents")
        .in("experience_id", experienceIds),
    ]);

  const hostById = new Map<string, { name?: string | null }>(
    (hosts || []).map((host: any) => [host.id, host]),
  );
  const priceByExperience = new Map<string, number>();

  for (const row of [...(lodgingPrices || []), ...(tripPrices || [])]) {
    if (!row.price_cents) continue;
    const current = priceByExperience.get(row.experience_id);
    if (current === undefined || row.price_cents < current) {
      priceByExperience.set(row.experience_id, row.price_cents);
    }
  }

  return scored.map(({ experience }: any) => ({
    ...experience,
    price_cents: priceByExperience.get(experience.id) ?? null,
    distance_km: null,
    has_promo: false,
    promo_badge: null,
    promo_discount_type: null,
    promo_discount_value: null,
    auto_apply_promo: false,
    is_available: true,
    host_name: hostById.get(experience.host_id)?.name ?? null,
  }));
}

function resolveMediaAssetUrl(
  asset: {
    path?: string | null;
    bucket?: string | null;
  } | null,
): string | null {
  if (!asset?.path) {
    return null;
  }
  return getImageUrl(asset.path, asset.bucket || "media");
}

function resolveVideoAssetUrl(
  asset: {
    path?: string | null;
    hls_playlist_url?: string | null;
    bucket?: string | null;
  } | null,
): string | null {
  if (!asset) {
    return null;
  }

  const videoUrl = resolveMediaAssetUrl(asset);
  if (videoUrl) {
    return videoUrl;
  }

  return getImageUrl(
    asset.hls_playlist_url || undefined,
    asset.bucket || "media",
  );
}

function resolveHlsAssetUrl(
  asset: {
    hls_playlist_url?: string | null;
    bucket?: string | null;
  } | null,
): string | null {
  if (!asset?.hls_playlist_url) {
    return null;
  }
  return getImageUrl(asset.hls_playlist_url, asset.bucket || "media");
}

async function executeSearch(
  db: any,
  queryEmbedding: number[] | null,
  params: z.infer<typeof searchExperiencesSchema>,
  overrides: {
    city_filter?: string | null;
    city_slug_filter?: string | null;
    region_filter?: string | null;
    semantic_threshold?: number;
    date_from?: string | null;
    date_to?: string | null;
  } = {},
) {
  const maxPriceCents = params.max_price_mad
    ? params.max_price_mad * 100
    : null;

  let sortBy = "relevance";
  if (params.sort_by_distance && params.user_lat && params.user_lng) {
    sortBy = "distance";
  } else if (params.only_with_promo || params.only_auto_apply) {
    sortBy = "promo_priority";
  }

  const thresholds =
    overrides.semantic_threshold !== undefined
      ? [overrides.semantic_threshold]
      : queryEmbedding
        ? [0.3, 0.2, 0.15]
        : [0.3];

  let lastResults: any[] | null = null;
  let lastThreshold = thresholds[0] ?? 0.3;

  for (const threshold of thresholds) {
    const { data: results, error } = await db.rpc(
      "search_experiences_enhanced",
      {
        query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
        semantic_threshold: threshold,
        text_query: params.query,
        exp_type: params.type || null,
        city_slug_filter:
          overrides.city_slug_filter !== undefined
            ? overrides.city_slug_filter
            : null,
        city_filter:
          overrides.city_filter !== undefined
            ? overrides.city_filter
            : params.city || null,
        region_filter:
          overrides.region_filter !== undefined
            ? overrides.region_filter
            : params.region || null,
        price_min_cents: null,
        price_max_cents: maxPriceCents,
        min_rating: params.min_rating || null,
        min_guests: params.guests || null,
        date_from:
          overrides.date_from !== undefined
            ? overrides.date_from
            : params.date_from || null,
        date_to:
          overrides.date_to !== undefined
            ? overrides.date_to
            : params.date_to || null,
        // Never filter by availability in search — lodging_availability table is deprecated.
        // Real availability is calculated on-demand from bookings via checkAvailability tool.
        check_availability: false,
        user_lat: params.user_lat || null,
        user_lng: params.user_lng || null,
        max_distance_km: params.max_distance_km || null,
        only_with_promo: params.only_with_promo || false,
        only_auto_apply: params.only_auto_apply || false,
        sort_by: sortBy,
        result_limit: params.limit || 10,
        result_offset: 0,
      },
    );

    if (error) {
      return { results, error, used_threshold: threshold };
    }

    lastResults = results;
    lastThreshold = threshold;

    if (results && results.length > 0) {
      return {
        results,
        error: null,
        used_threshold: threshold,
      };
    }
  }

  return { results: lastResults, error: null, used_threshold: lastThreshold };
}

async function formatResults(results: any[], db: any) {
  if (!results || results.length === 0) return [];

  const formatted = results.map((exp: any) => ({
    id: exp.id,
    title: exp.title,
    description: exp.short_description,
    type: exp.type,
    city: exp.city,
    region: exp.region,
    price_mad: exp.price_cents ? exp.price_cents / 100 : null,
    rating: exp.avg_rating,
    reviews_count: exp.reviews_count,
    distance_km: exp.distance_km,
    has_promo: exp.has_promo,
    promo_badge: exp.promo_badge,
    promo_type: exp.promo_discount_type,
    promo_value: exp.promo_discount_value,
    auto_apply_promo: exp.auto_apply_promo,
    is_available: exp.is_available,
    host_name: exp.host_name,
    thumbnail_url: exp.thumbnail_url,
    video_url: undefined as string | undefined,
    video_hls_url: undefined as string | undefined,
    gallery: undefined as string[] | undefined,
    rooms: undefined as any,
    _video_id: exp.video_id as string | null | undefined,
  }));

  const experienceIds = formatted.map((e) => e.id);

  // Canonical media linkage: experiences.video_id -> media_assets via FK
  if (experienceIds.length > 0) {
    const { data: experienceMedia } = await db
      .from("experiences")
      .select(`
        id,
        thumbnail_url,
        video:media_assets!fk_experiences_video(
          id,
          path,
          hls_playlist_url,
          bucket
        )
      `)
      .in("id", experienceIds)
      .is("deleted_at", null);

    if (experienceMedia) {
      const mediaByExperience = new Map<string, any>();
      for (const row of experienceMedia) {
        const videoData = Array.isArray(row.video)
          ? row.video[0] || null
          : row.video;
        mediaByExperience.set(row.id, {
          thumbnail_url: row.thumbnail_url,
          video: videoData,
        });
      }

      for (const experience of formatted) {
        const linkedMedia = mediaByExperience.get(experience.id);
        if (!linkedMedia) continue;

        if (!experience.thumbnail_url && linkedMedia.thumbnail_url) {
          experience.thumbnail_url = linkedMedia.thumbnail_url;
        }

        if (!experience.video_url) {
          const linkedVideoUrl = resolveVideoAssetUrl(linkedMedia.video);
          if (linkedVideoUrl) {
            experience.video_url = linkedVideoUrl;
          }
        }

        if (!experience.video_hls_url && linkedMedia.video?.hls_playlist_url) {
          const linkedHlsUrl = resolveHlsAssetUrl(linkedMedia.video);
          if (linkedHlsUrl) {
            experience.video_hls_url = linkedHlsUrl;
          }
        }

        if (!experience._video_id && linkedMedia.video?.id) {
          experience._video_id = linkedMedia.video.id;
        }
      }
    }
  }

  // Fallback video resolution from raw video IDs when direct FK join did not yield URLs.
  const videoIds = Array.from(
    new Set(
      formatted
        .filter((item) => !item.video_url)
        .map((item) => item._video_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (videoIds.length > 0) {
    const { data: videoAssets } = await db
      .from("media_assets")
      .select("id, path, hls_playlist_url, bucket")
      .in("id", videoIds)
      .is("deleted_at", null);

    const videoById = new Map<string, any>();
    for (const asset of videoAssets || []) {
      videoById.set(asset.id, asset);
    }

    for (const experience of formatted) {
      if (experience.video_url) continue;
      if (!experience._video_id) continue;
      const asset = videoById.get(experience._video_id);
      const videoUrl = resolveVideoAssetUrl(asset);
      experience.video_url = videoUrl || undefined;
      const hlsUrl = resolveHlsAssetUrl(asset);
      if (hlsUrl) {
        experience.video_hls_url = hlsUrl;
      }
    }
  }

  // Fetch gallery images for all returned experiences
  if (experienceIds.length > 0) {
    const { data: media } = await db
      .from("experience_media")
      .select(`
        experience_id,
        media_id,
        media_asset:media_assets!experience_media_media_id_fkey (
          id,
          path,
          hls_playlist_url,
          bucket,
          kind
        )
      `)
      .in("experience_id", experienceIds)
      .order("order_index", { ascending: true });

    if (media) {
      const galleryByExp: Record<string, string[]> = {};
      const fallbackVideoByExp: Record<string, string> = {};
      const fallbackHlsByExp: Record<string, string> = {};
      for (const m of media) {
        if (!galleryByExp[m.experience_id]) galleryByExp[m.experience_id] = [];
        if (m.media_asset?.kind === "video") {
          if (!fallbackVideoByExp[m.experience_id]) {
            const videoUrl = resolveVideoAssetUrl(m.media_asset);
            if (videoUrl) {
              fallbackVideoByExp[m.experience_id] = videoUrl;
            }
          }
          if (!fallbackHlsByExp[m.experience_id]) {
            const hlsUrl = resolveHlsAssetUrl(m.media_asset);
            if (hlsUrl) {
              fallbackHlsByExp[m.experience_id] = hlsUrl;
            }
          }
          continue;
        }

        const url = resolveMediaAssetUrl(m.media_asset);
        if (!url) continue;
        if (galleryByExp[m.experience_id].includes(url)) continue;
        galleryByExp[m.experience_id].push(url);
      }

      for (const exp of formatted) {
        if (!exp.video_url && fallbackVideoByExp[exp.id]) {
          exp.video_url = fallbackVideoByExp[exp.id];
        }
        if (!exp.video_hls_url && fallbackHlsByExp[exp.id]) {
          exp.video_hls_url = fallbackHlsByExp[exp.id];
        }
        if (galleryByExp[exp.id]) {
          exp.gallery = galleryByExp[exp.id];
        }
        if (!exp.thumbnail_url && exp.gallery?.length) {
          exp.thumbnail_url = exp.gallery[0];
        }
      }
    }
  }

  // Fetch room types for lodging experiences
  const lodgingIds = formatted
    .filter((e) => e.type === "lodging")
    .map((e) => e.id);

  if (lodgingIds.length > 0) {
    const { data: rooms } = await db
      .from("lodging_room_types")
      .select(
        "id, experience_id, name, room_type, price_cents, capacity_beds, max_persons, photos",
      )
      .in("experience_id", lodgingIds)
      .is("deleted_at", null)
      .order("price_cents", { ascending: true });

    if (rooms) {
      const roomsByExp: Record<string, any[]> = {};
      for (const r of rooms) {
        if (!roomsByExp[r.experience_id]) roomsByExp[r.experience_id] = [];
        roomsByExp[r.experience_id].push({
          room_type_id: r.id,
          name: r.name || r.room_type,
          type: r.room_type,
          price_mad: r.price_cents ? r.price_cents / 100 : 0,
          capacity_beds: r.capacity_beds,
          max_persons: r.max_persons,
          photos:
            r.photos?.map((id: string) => getImageUrl(id)).filter(Boolean) ||
            [],
        });
      }
      for (const exp of formatted) {
        if (roomsByExp[exp.id]) {
          exp.rooms = roomsByExp[exp.id];
        }
      }
    }
  }

  return formatted.map(({ _video_id, ...experience }) => experience);
}

export const searchExperiences = tool({
  description: `Search for Okeyo Travel experiences in Morocco using semantic search.
This tool combines AI-powered semantic search with filters like location, price, dates, and promotions.
Use this when users ask to find, search, or discover experiences.
The tool handles city name variants. Use it to resolve named experiences/properties too: pass the exact name or partial name in query, with limit 4, before asking clarifying questions. Use city for the main catalog city/province. Use region only for stored administrative regions; keep local areas/neighborhoods in query text. Keep type unset for broad "experiences/options/what to do" requests so lodging, trips, and activities can all match. It keeps requested locations strict unless allow_location_fallback is true.`,
  inputSchema: searchExperiencesSchema,
  execute: async (params) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      const directTitleMatches = await findDirectTitleMatches(db, params);
      if (directTitleMatches && directTitleMatches.length > 0) {
        return {
          success: true,
          count: directTitleMatches.length,
          results: await formatResults(directTitleMatches, db),
          has_more: directTitleMatches.length >= (params.limit || 4),
          note: "Résultats trouvés par correspondance directe sur le nom de l'expérience.",
        };
      }
      if (
        directTitleMatches &&
        directTitleMatches.length === 0 &&
        looksLikeSingularExperienceNameQuery(params.query)
      ) {
        return {
          success: true,
          count: 0,
          results: [],
          has_more: false,
          note: `Aucune expérience ne correspond au nom "${params.query}". Vérifiez l'orthographe ou précisez la destination.`,
        };
      }

      // Generate embedding for the search query
      let queryEmbedding: number[] | null = null;
      try {
        queryEmbedding = await embedQuery(params.query);
      } catch (embError) {
        console.warn(
          "Embedding generation failed, falling back to text search:",
          embError,
        );
      }

      // === STRATEGY: Progressive search with canonical city_slug resolution in SQL ===
      // Availability is NOT checked here (lodging_availability is deprecated).
      // Use checkAvailability tool separately for real-time booking-based checks.
      // 1. Try exact search as requested. The SQL RPC resolves canonical city_slug/region from cities.
      // 2. If 0 results: try text variants against city input.
      // 3. If 0 results: try text variants against region input.
      // 4. If user explicitly agreed to alternatives: drop location filters.

      let searchNote: string | null = null;

      const cityCandidates = buildLocationCandidates(params.city);
      const regionCandidates = buildLocationCandidates(params.region);

      // --- Attempt 1: Exact search as requested; SQL resolves canonical city_slug/region ---
      let { results, error } = await executeSearch(
        db,
        queryEmbedding,
        params,
        {},
      );

      if (error) {
        console.error("Search error:", error);
        return { success: false, error: error.message, results: [] };
      }

      if (results && results.length > 0) {
        if (params.city || params.region) {
          searchNote =
            "Résultats trouvés avec le filtre de destination demandé.";
        }

        return {
          success: true,
          count: results.length,
          results: await formatResults(results, db),
          has_more: results.length >= (params.limit || 10),
          note: searchNote,
        };
      }

      // --- Attempt 2: If city was specified, try text variants against city field ---
      for (const candidate of cityCandidates) {
        const attempt = await executeSearch(db, queryEmbedding, params, {
          city_slug_filter: null,
          city_filter: candidate,
          region_filter: params.region || null,
        });

        if (attempt.results && attempt.results.length > 0) {
          results = attempt.results;
          searchNote = `Résultats trouvés en filtrant la ville avec "${candidate}".`;
          break;
        }
      }

      // --- Attempt 3: Try region text variants ---
      if (!results || results.length === 0) {
        for (const candidate of regionCandidates) {
          const attempt = await executeSearch(db, queryEmbedding, params, {
            city_slug_filter: null,
            city_filter: null,
            region_filter: candidate,
          });

          if (attempt.results && attempt.results.length > 0) {
            results = attempt.results;
            searchNote = `Résultats trouvés en filtrant la région avec "${candidate}".`;
            break;
          }
        }
      }

      if (results && results.length > 0) {
        return {
          success: true,
          count: results.length,
          results: await formatResults(results, db),
          has_more: results.length >= (params.limit || 10),
          note: searchNote,
        };
      }

      // --- Attempt 4: If the model guessed a type for a broad destination query, relax it ---
      if (
        (!results || results.length === 0) &&
        shouldRetryWithoutTypeFilter(params)
      ) {
        const relaxedParams = { ...params, type: undefined };
        const attempt = await executeSearch(db, queryEmbedding, relaxedParams);

        if (attempt.results && attempt.results.length > 0) {
          results = attempt.results;
          searchNote =
            "Résultats trouvés en gardant la destination demandée, sans filtre de type, car la demande était générale.";
        }
      }

      if (results && results.length > 0) {
        return {
          success: true,
          count: results.length,
          results: await formatResults(results, db),
          has_more: results.length >= (params.limit || 10),
          note: searchNote,
        };
      }

      // --- Attempt 5: Drop location filters only after explicit user consent ---
      if ((params.city || params.region) && params.allow_location_fallback) {
        const attempt = await executeSearch(db, queryEmbedding, params, {
          city_slug_filter: null,
          city_filter: null,
          region_filter: null,
        });
        if (attempt.results && attempt.results.length > 0) {
          results = attempt.results;
          const location = params.city || params.region;
          searchNote = `Aucune expérience trouvée à "${location}". Voici des alternatives disponibles sur la plateforme.`;
        }
      }

      if (results && results.length > 0) {
        return {
          success: true,
          count: results.length,
          results: await formatResults(results, db),
          has_more: results.length >= (params.limit || 10),
          note: searchNote,
        };
      }

      // --- Nothing found at all ---
      return {
        success: true,
        count: 0,
        results: [],
        has_more: false,
        note:
          params.city || params.region
            ? `Aucune expérience ne correspond à votre recherche dans "${params.city || params.region}".`
            : "Aucune expérience ne correspond à votre recherche. Essayez avec des critères différents.",
      };
    } catch (error) {
      console.error("Search experiences error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results: [],
      };
    }
  },
});
