import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import type { AppLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";
import type { GuideItemSearchResult } from "@/types/guide-items";

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
    .default(6)
    .describe("Maximum number of guide items to return."),
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
Call this tool whenever you want guide-item cards to appear in the chat UI. Do not only describe the recommendation in text if cards should be shown.`,
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
        const { data, error } = await supabase.rpc("search_guide_items", {
          p_query_embedding: queryEmbedding
            ? JSON.stringify(queryEmbedding)
            : null,
          p_text_query: textQuery,
          p_city_slug: citySlug,
          p_kinds: normalizedKinds,
          p_limit: limit,
          p_min_similarity: minSimilarity,
          p_include_unpublished: false,
        });

        if (error) {
          console.error("searchGuideItems RPC error:", error);
          return {
            success: false,
            type: "guide_item_cards",
            count: 0,
            items: [],
            error: error.message,
          };
        }

        const results = (data ?? []) as GuideItemSearchResult[];

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

        const { data: guideItemRows, error: guideItemError } = await supabase
          .from("guide_items")
          .select(
            "id, author_name, author_avatar_url, agence_name, contact_email, contact_phones, source_platforms, reviews, metadata, payment_i18n, menu_image_urls",
          )
          .in(
            "id",
            results.map((result) => result.id),
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
            if (!guideItem) continue;

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
