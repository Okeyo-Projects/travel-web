import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import { searchGuideItemsWithFallback } from "@/lib/guide-items-search";
import type { AppLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";

const searchGuideItemsSchema = z.object({
  query: z
    .string()
    .optional()
    .default("")
    .describe(
      "Natural-language query for the local recommendation, such as a restaurant name, cuisine, vibe, or need.",
    ),
  city: z
    .string()
    .optional()
    .describe('City name or slug, for example "Marrakech" or "marrakech".'),
  kinds: z
    .array(
      z.enum([
        "restaurant",
        "transport",
        "wellness",
        "shopping",
        "museum",
        "activity",
        "other",
      ]),
    )
    .optional()
    .describe(
      "Guide-item categories to filter by. Use restaurant for dining recommendations, transport for transfers/taxis, etc.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .default(3)
    .describe(
      "Maximum number of guide items to return. Use 1 when the user asks for one best option.",
    ),
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe("Minimum semantic similarity threshold."),
});

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCitySlug(value: string | null): string | null {
  if (!value) return null;

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKinds(
  input:
    | Array<
        | "restaurant"
        | "transport"
        | "wellness"
        | "shopping"
        | "museum"
        | "activity"
        | "other"
      >
    | undefined,
) {
  if (!input || input.length === 0) return null;
  return [...new Set(input)];
}

export function createSearchGuideItemsTool(defaultLocale: AppLocale = "fr") {
  return tool({
    description: `Search curated local guide items such as restaurants, transport options, wellness places, museums, shopping spots, and other non-bookable recommendations.
Use this when the user asks for where to eat, a taxi or transfer, a spa or hammam, a museum, local shopping, or general local recommendations in a city.
Call this tool whenever you want guide-item cards to appear in the chat UI. Do not only describe the recommendation in text if cards should be shown.
Set limit deliberately: 1 for a single best pick, around 3 for a short list, and only higher when the user explicitly asks for several options.`,
    inputSchema: searchGuideItemsSchema,
    execute: async ({ query, city, kinds, limit, minSimilarity }) => {
      try {
        const textQuery = normalizeOptionalString(query);
        const citySlug = normalizeCitySlug(normalizeOptionalString(city));
        const normalizedKinds = normalizeKinds(kinds);

        let queryEmbedding: number[] | null = null;
        if (textQuery) {
          try {
            queryEmbedding = await embedQuery(textQuery);
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
          textQuery,
          citySlug,
          kinds: normalizedKinds,
          limit,
          minSimilarity,
          includeUnpublished: false,
        });

        if (results.length === 0) {
          return {
            success: true,
            type: "guide_item_cards",
            count: 0,
            items: [],
            note: citySlug
              ? `No guide items found for ${citySlug}.`
              : "No guide items found.",
          };
        }

        const items = results.map((result) =>
          mapGuideItemSearchRowToChatCardData(result, defaultLocale),
        );

        return {
          success: true,
          type: "guide_item_cards",
          count: items.length,
          items,
          note:
            citySlug && items.length > 0
              ? `Guide items found in ${citySlug}.`
              : undefined,
        };
      } catch (error) {
        console.error("searchGuideItems tool error:", error);
        return {
          success: false,
          type: "guide_item_cards",
          count: 0,
          items: [],
          error:
            error instanceof Error
              ? error.message
              : "Unexpected guide item search error.",
        };
      }
    },
  });
}

export const searchGuideItems = createSearchGuideItemsTool();
