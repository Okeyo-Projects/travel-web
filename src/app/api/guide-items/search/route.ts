import { type NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const filtered = value
    .map((item) => (typeof item === "string" ? item.trim() : null))
    .filter((item): item is string => item !== null && item.length > 0);
  return filtered.length > 0 ? filtered : null;
}

function normalizeNumber(
  value: unknown,
  min?: number,
  max?: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (min !== undefined && value < min) return null;
  if (max !== undefined && value > max) return null;
  return value;
}

/**
 * POST /api/guide-items/search
 *
 * Server-side guide-item semantic search.
 *
 * - Converts the user's text query into a 1536-dim embedding using OpenAI
 *   `text-embedding-3-large` (server-side only; the API key never reaches the browser).
 * - Calls the `search_guide_items` Supabase RPC, which combines vector similarity
 *   with full-text ranking and optional city/kind filters.
 * - Returns the ranked results ordered by `relevance_score`.
 *
 * The RPC is executed with the service-role key so the endpoint works for both
 * anonymous and authenticated visitors.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const query = normalizeOptionalString(payload.query);
    const citySlug = normalizeOptionalString(payload.citySlug);
    const kinds = normalizeStringArray(payload.kinds);
    const limit = normalizeNumber(payload.limit, 1, 100) ?? 10;
    const minSimilarity = normalizeNumber(payload.minSimilarity, 0, 1) ?? 0.7;

    let queryEmbedding: number[] | null = null;
    if (query) {
      try {
        queryEmbedding = await embedQuery(query);
      } catch (embeddingError) {
        console.warn(
          "Guide item embedding generation failed, falling back to text search:",
          embeddingError,
        );
      }
    }

    const supabase = createServiceRoleClientOrThrow();
    const { data, error } = await supabase.rpc("search_guide_items", {
      p_query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
      p_text_query: query,
      p_city_slug: citySlug,
      p_kinds: kinds,
      p_limit: limit,
      p_min_similarity: minSimilarity,
      p_include_unpublished: false,
    });

    if (error) {
      console.error("search_guide_items RPC error:", error);
      return NextResponse.json(
        { error: "Search failed. Please try again later." },
        { status: 500 },
      );
    }

    const results = data ?? [];

    // Enrich the RPC payload with additional guide-item fields used by the card.
    if (results.length > 0) {
      const { data: guideItemRows, error: guideItemError } = await supabase
        .from("guide_items")
        .select(
          "id, author_name, author_avatar_url, agence_name, contact_email, contact_phones, source_platforms, reviews, metadata, payment_i18n, menu_image_urls",
        )
        .in(
          "id",
          results.map((r) => r.id),
        );

      if (!guideItemError && guideItemRows) {
        const guideItemById = new Map(
          (
            guideItemRows as Array<
              Record<string, unknown> & {
                id: string;
              }
            >
          ).map((row) => [row.id, row] as const),
        );
        for (const result of results) {
          const guideItem = guideItemById.get(result.id);
          if (guideItem) {
            Object.assign(result, {
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
              contact_phones: Array.isArray(guideItem.contact_phones)
                ? guideItem.contact_phones.filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
              source_platforms: Array.isArray(guideItem.source_platforms)
                ? guideItem.source_platforms.filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
              reviews: Array.isArray(guideItem.reviews) ? guideItem.reviews : [],
              metadata:
                guideItem.metadata &&
                typeof guideItem.metadata === "object" &&
                !Array.isArray(guideItem.metadata)
                  ? guideItem.metadata
                  : null,
              payment_i18n:
                guideItem.payment_i18n &&
                typeof guideItem.payment_i18n === "object" &&
                !Array.isArray(guideItem.payment_i18n)
                  ? guideItem.payment_i18n
                  : null,
              menu_image_urls: Array.isArray(guideItem.menu_image_urls)
                ? guideItem.menu_image_urls.filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
            });
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Guide item search endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process search request." },
      { status: 500 },
    );
  }
}
