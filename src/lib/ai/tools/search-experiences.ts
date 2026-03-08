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
      "Requested type from model. Runtime enforces lodging-only search.",
    ),
  city: z
    .string()
    .optional()
    .describe('Filter by city name (e.g., "Marrakech", "Chefchaouen")'),
  region: z
    .string()
    .optional()
    .describe(
      'Filter by region/area name (e.g., "Imlil", "Ouirgane", "Lala Takerkousst")',
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
});

const FORCED_EXPERIENCE_TYPE = "lodging";

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

function toCitySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

async function executeSearch(
  db: any,
  queryEmbedding: number[] | null,
  params: z.infer<typeof searchExperiencesSchema>,
  overrides: {
    city_filter?: string | null;
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
        exp_type: FORCED_EXPERIENCE_TYPE,
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

    const lodgingResults = Array.isArray(results)
      ? results.filter((exp: any) => exp?.type === FORCED_EXPERIENCE_TYPE)
      : results;

    lastResults = lodgingResults;
    lastThreshold = threshold;

    if (lodgingResults && lodgingResults.length > 0) {
      return {
        results: lodgingResults,
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
      for (const m of media) {
        if (!galleryByExp[m.experience_id]) galleryByExp[m.experience_id] = [];
        if (m.media_asset?.kind === "video") {
          if (!fallbackVideoByExp[m.experience_id]) {
            const videoUrl = resolveVideoAssetUrl(m.media_asset);
            if (videoUrl) {
              fallbackVideoByExp[m.experience_id] = videoUrl;
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
  description: `Search for lodging experiences in Morocco using semantic search.
This tool combines AI-powered semantic search with filters like location, price, dates, and promotions.
Use this when users ask to find, search, or discover experiences.
The tool automatically handles city name variants and does progressive fallback searches if no results are found.`,
  inputSchema: searchExperiencesSchema,
  execute: async (params) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

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

      // === STRATEGY: Progressive search with automatic fallback ===
      // Availability is NOT checked here (lodging_availability is deprecated).
      // Use checkAvailability tool separately for real-time booking-based checks.
      // 1. Try with exact filters (city + region + type)
      // 2. If 0 results: try city variants (handle typos in DB)
      // 3. If 0 results: try city as region (e.g., "Imlil" is a region)
      // 4. If 0 results: drop location filters entirely

      let searchNote: string | null = null;

      // --- Attempt 1: Exact search as requested ---
      let { results, error } = await executeSearch(db, queryEmbedding, params);

      if (error) {
        console.error("Search error:", error);
        return { success: false, error: error.message, results: [] };
      }

      if (results && results.length > 0) {
        return {
          success: true,
          count: results.length,
          results: await formatResults(results, db),
          has_more: results.length >= (params.limit || 10),
        };
      }

      // --- Attempt 2: If city was specified, try variant spellings ---
      const locationInputs = uniqueStrings([params.city, params.region]);
      const locationCandidates = uniqueStrings(
        locationInputs.flatMap((location) => [
          location,
          normalizeCity(location),
          ...getCityVariants(location),
        ]),
      ).slice(0, 12);

      for (const candidate of locationCandidates) {
        const attempt = await executeSearch(db, queryEmbedding, params, {
          city_filter: candidate,
          region_filter: null,
        });

        if (attempt.results && attempt.results.length > 0) {
          results = attempt.results;
          searchNote = `Résultats trouvés en filtrant la ville avec "${candidate}".`;
          break;
        }
      }

      // --- Attempt 3: If city/region was ambiguous, try candidate as region ---
      if (!results || results.length === 0) {
        for (const candidate of locationCandidates) {
          const attempt = await executeSearch(db, queryEmbedding, params, {
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

      // --- Attempt 4: Resolve by city_slug, then retry with canonical city/region ---
      const slugCandidates = uniqueStrings(
        locationCandidates.map((location) => toCitySlug(location)),
      ).slice(0, 12);

      if ((!results || results.length === 0) && slugCandidates.length > 0) {
        const { data: slugMatches, error: slugError } = await db
          .from("experiences")
          .select("city, region, city_slug")
          .eq("status", "published")
          .is("deleted_at", null)
          .in("city_slug", slugCandidates);

        if (!slugError && slugMatches && slugMatches.length > 0) {
          const matchedCities = uniqueStrings(
            slugMatches.map((match: any) => match.city),
          );
          const matchedRegions = uniqueStrings(
            slugMatches.map((match: any) => match.region),
          );

          for (const matchedCity of matchedCities) {
            const attempt = await executeSearch(db, queryEmbedding, params, {
              city_filter: matchedCity,
              region_filter: null,
            });
            if (attempt.results && attempt.results.length > 0) {
              results = attempt.results;
              searchNote = `Résultats trouvés via city_slug pour la ville "${matchedCity}".`;
              break;
            }
          }

          if (!results || results.length === 0) {
            for (const matchedRegion of matchedRegions) {
              const attempt = await executeSearch(db, queryEmbedding, params, {
                city_filter: null,
                region_filter: matchedRegion,
              });
              if (attempt.results && attempt.results.length > 0) {
                results = attempt.results;
                searchNote = `Résultats trouvés via city_slug pour la région "${matchedRegion}".`;
                break;
              }
            }
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

      // --- Attempt 5: Drop location filters entirely ---
      if (params.city || params.region) {
        const attempt = await executeSearch(db, queryEmbedding, params, {
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
        note: "Aucune expérience ne correspond à votre recherche. Essayez avec des critères différents.",
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
