import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import {
  normalizeGuideItemCitySlug,
  searchGuideItemsByName,
  searchGuideItemsWithFallback,
} from "@/lib/guide-items-search";
import type { AppLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";
import {
  GUIDE_ITEM_KINDS,
  type GuideItemKind,
  type GuideItemSearchResult,
} from "@/types/guide-items";

const INTRO_MIX_PRESET = "essaouira_intro_mix" as const;

interface GuideItemPresentation {
  intro: string;
  follow_up_question?: string;
}

const INTRO_MIX_SEARCHES = [
  {
    slot: "restaurant",
    query: "restaurant cuisine locale à Essaouira",
    kinds: ["restaurant"],
    fallbackKinds: null,
  },
  {
    slot: "cafe",
    query: "café coffee brunch salon de thé à Essaouira",
    kinds: ["coffee"],
    fallbackKinds: ["restaurant"],
  },
  {
    slot: "activity",
    query: "activité expérience à faire à Essaouira",
    kinds: ["activity"],
    fallbackKinds: null,
  },
  {
    slot: "place_to_visit",
    query: "lieu à visiter monument musée hidden gem à Essaouira",
    kinds: [
      "museum",
      "beach",
      "nature",
      "viewpoint",
      "market",
      "religious",
      "other",
    ],
    fallbackKinds: ["activity"],
  },
] as const;

const searchGuideItemsSchema = z.object({
  preset: z
    .enum([INTRO_MIX_PRESET])
    .optional()
    .describe(
      "Use essaouira_intro_mix only when the entire first user message is a short standalone affirmation accepting the quick Essaouira test. Never use it when the message names a destination, category, place, preference, or concrete request. It returns one restaurant, one cafe, one activity, and one place to visit in a single card group.",
    ),
  searchMode: z
    .enum(["discovery", "name"])
    .optional()
    .default("discovery")
    .describe(
      'Use "name" whenever the user asks about a specific named place. Name mode searches titles and slugs first, ignores category filters, and reports whether the name was found, ambiguous, or not found.',
    ),
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
    .array(z.enum(GUIDE_ITEM_KINDS))
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
    .default(0.55)
    .describe("Minimum semantic similarity threshold."),
  presentation: z
    .object({
      intro: z
        .string()
        .min(1)
        .max(240)
        .describe(
          "One short localized introduction for the whole result set. Do not include item names or descriptions.",
        ),
      follow_up_question: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe(
          "Optional single localized follow-up question. The UI displays it after the final card.",
        ),
    })
    .optional()
    .describe(
      "Presentation copy rendered by the card UI. Use this instead of writing a separate assistant summary or numbered list.",
    ),
});

function buildDefaultPresentation(
  locale: AppLocale,
  count: number,
  citySlug: string | null,
): GuideItemPresentation {
  const city = citySlug
    ? citySlug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : null;

  if (locale === "ar") {
    return {
      intro: city
        ? `إليك ${count} اقتراحات في ${city} 👇`
        : `إليك ${count} اقتراحات 👇`,
    };
  }

  if (locale === "en") {
    return {
      intro: city
        ? `Here are ${count} recommendations in ${city} 👇`
        : `Here are ${count} recommendations 👇`,
    };
  }

  return {
    intro: city
      ? `Voici ${count} recommandations à ${city} 👇`
      : `Voici ${count} recommandations 👇`,
  };
}

function normalizePresentation(
  presentation: GuideItemPresentation | undefined,
  locale: AppLocale,
  count: number,
  citySlug: string | null,
): GuideItemPresentation {
  const intro = presentation?.intro.trim();
  const followUpQuestion = presentation?.follow_up_question?.trim();
  const fallback = buildDefaultPresentation(locale, count, citySlug);

  return {
    intro: intro || fallback.intro,
    ...(followUpQuestion ? { follow_up_question: followUpQuestion } : {}),
  };
}

async function createQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    return await embedQuery(query);
  } catch (embeddingError) {
    console.warn(
      "Guide item embedding generation failed, falling back to text search:",
      embeddingError,
    );
    return null;
  }
}

async function searchEssaouiraIntroMix(
  minSimilarity: number,
): Promise<GuideItemSearchResult[]> {
  const supabase = createServiceRoleClientOrThrow();
  const categoryResults = await Promise.all(
    INTRO_MIX_SEARCHES.map(async (category) => {
      const queryEmbedding = await createQueryEmbedding(category.query);
      const { results } = await searchGuideItemsWithFallback(supabase, {
        queryEmbedding,
        textQuery: category.query,
        citySlug: "essaouira",
        kinds: [...category.kinds],
        limit: 6,
        minSimilarity,
        includeUnpublished: false,
      });

      if (results.length > 0 || !category.fallbackKinds) {
        return results;
      }

      const { results: fallbackResults } = await searchGuideItemsWithFallback(
        supabase,
        {
          queryEmbedding,
          textQuery: category.query,
          citySlug: "essaouira",
          kinds: [...category.fallbackKinds],
          limit: 6,
          minSimilarity,
          includeUnpublished: false,
        },
      );
      return fallbackResults;
    }),
  );

  const selected: GuideItemSearchResult[] = [];
  const selectedIds = new Set<string>();

  for (const candidates of categoryResults) {
    const candidate = candidates.find((item) => !selectedIds.has(item.id));
    if (!candidate) continue;
    selected.push(candidate);
    selectedIds.add(candidate.id);
  }

  if (selected.length < INTRO_MIX_SEARCHES.length) {
    const { results: fallbackResults } = await searchGuideItemsWithFallback(
      supabase,
      {
        queryEmbedding: null,
        textQuery: null,
        citySlug: "essaouira",
        kinds: [
          "restaurant",
          "coffee",
          "activity",
          "museum",
          "beach",
          "nature",
          "viewpoint",
          "market",
          "religious",
          "other",
        ],
        limit: 12,
        minSimilarity,
        includeUnpublished: false,
      },
    );

    for (const candidate of fallbackResults) {
      if (selected.length >= INTRO_MIX_SEARCHES.length) break;
      if (selectedIds.has(candidate.id)) continue;
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  return selected;
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCitySlug(value: string | null): string | null {
  if (!value) return null;

  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizeGuideItemCitySlug(slug);
}

function normalizeKinds(input: GuideItemKind[] | undefined) {
  if (!input || input.length === 0) return null;
  return [...new Set(input)];
}

export function createSearchGuideItemsTool(defaultLocale: AppLocale = "fr") {
  return tool({
    description: `Search curated local guide items such as restaurants, transport options, wellness places, museums, shopping spots, and other non-bookable recommendations.
Use this when the user asks for where to eat, a taxi or transfer, a spa or hammam, a museum, local shopping, or general local recommendations in a city.
Whenever the user asks whether you know, recognize, or have details about one specifically named place, you MUST call this tool with searchMode="name" and query set to the place name. Do not add a kinds filter in name mode, even when the name contains words like coffee, restaurant, spa, or museum.
Name mode returns matchStatus="found", "ambiguous", or "not_found". Treat suggested=true items only as possible corrections and ask the user to confirm them. Never claim a named place is absent before using name mode, and never present discovery alternatives as if they matched the requested name.
Call this tool whenever you want guide-item cards to appear in the chat UI. Do not only describe the recommendation in text if cards should be shown.
For every search that can return cards, set presentation.intro to one short localized overview without item names or descriptions. Put an optional question in presentation.follow_up_question so the UI renders it after the final card. Do not write separate assistant prose, a numbered list, or descriptions of the returned items; the card UI already renders each item's description immediately above its card.
When the user's entire first message is only a short standalone affirmation accepting the quick Essaouira test, call this tool once with preset="essaouira_intro_mix". Never use the preset for a message that names a destination, category, place, preference, or concrete request. The preset's localized introduction is generated automatically and it must not have a follow-up question.
Set limit deliberately: 1 for a single best pick, around 3 for a short list, and only higher when the user explicitly asks for several options.
The tool result is the complete visible response whenever cards are returned.`,
    inputSchema: searchGuideItemsSchema,
    execute: async ({
      preset,
      searchMode,
      query,
      city,
      kinds,
      limit,
      minSimilarity,
      presentation,
    }) => {
      try {
        if (preset === INTRO_MIX_PRESET) {
          const results = await searchEssaouiraIntroMix(minSimilarity);
          const items = results.map((result) =>
            mapGuideItemSearchRowToChatCardData(result, defaultLocale),
          );

          return {
            success: true,
            type: "guide_item_cards",
            count: items.length,
            items,
            presentation: {
              intro:
                defaultLocale === "ar"
                  ? "إليك مجموعة أولى لاكتشاف الصويرة 👇"
                  : defaultLocale === "en"
                    ? "Here is a first selection for discovering Essaouira 👇"
                    : "Voici une première sélection pour découvrir Essaouira 👇",
            },
            note: "Mixed Essaouira introduction recommendations.",
          };
        }

        const textQuery = normalizeOptionalString(query);
        const citySlug = normalizeCitySlug(normalizeOptionalString(city));

        if (searchMode === "name") {
          if (!textQuery) {
            return {
              success: true,
              type: "guide_item_cards",
              matchStatus: "not_found" as const,
              count: 0,
              items: [],
              note: "Name mode requires a specific place name.",
            };
          }

          const supabase = createServiceRoleClientOrThrow();
          const nameMatch = await searchGuideItemsByName(supabase, {
            name: textQuery,
            citySlug,
            limit,
          });

          if (nameMatch.status !== "not_found") {
            const items = nameMatch.results.map((result) =>
              mapGuideItemSearchRowToChatCardData(result, defaultLocale),
            );

            return {
              success: true,
              type: "guide_item_cards",
              matchStatus: nameMatch.status,
              count: items.length,
              items,
              presentation: normalizePresentation(
                presentation,
                defaultLocale,
                items.length,
                citySlug,
              ),
              note:
                nameMatch.status === "ambiguous"
                  ? "Several catalog items match this name. Ask the user which city or location they mean."
                  : "Named guide item found in the catalog.",
            };
          }

          const queryEmbedding = await createQueryEmbedding(textQuery);
          const { results: semanticResults } =
            await searchGuideItemsWithFallback(supabase, {
              queryEmbedding,
              textQuery,
              citySlug,
              kinds: null,
              limit,
              minSimilarity,
              includeUnpublished: false,
            });
          const possibleMatches = semanticResults.filter((result) => {
            const score = result.semantic_score ?? result.relevance_score ?? 0;
            return score >= minSimilarity;
          });
          const items = possibleMatches.map((result) =>
            mapGuideItemSearchRowToChatCardData(result, defaultLocale),
          );

          return {
            success: true,
            type: "guide_item_cards",
            matchStatus: "not_found" as const,
            suggested: items.length > 0,
            count: items.length,
            items,
            ...(items.length > 0
              ? {
                  presentation: normalizePresentation(
                    presentation,
                    defaultLocale,
                    items.length,
                    citySlug,
                  ),
                }
              : {}),
            note:
              items.length > 0
                ? "No lexical name match. These are possible semantic corrections only; ask the user to confirm."
                : "No named guide item or reliable semantic correction found. Ask for the city, neighborhood, or spelling before offering alternatives.",
          };
        }

        const normalizedKinds = normalizeKinds(kinds);

        const queryEmbedding = textQuery
          ? await createQueryEmbedding(textQuery)
          : null;

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
          presentation: normalizePresentation(
            presentation,
            defaultLocale,
            items.length,
            citySlug,
          ),
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
