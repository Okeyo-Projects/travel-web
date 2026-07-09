import { type NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { searchGuideItemsWithFallback } from "@/lib/guide-items-search";
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
    const minSimilarity = normalizeNumber(payload.minSimilarity, 0, 1) ?? 0.55;

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
    const { results } = await searchGuideItemsWithFallback(supabase, {
      queryEmbedding,
      textQuery: query,
      citySlug,
      kinds,
      limit,
      minSimilarity,
      includeUnpublished: false,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Guide item search endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process search request." },
      { status: 500 },
    );
  }
}
