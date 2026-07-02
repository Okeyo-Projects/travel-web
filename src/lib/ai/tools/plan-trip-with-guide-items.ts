import { embedQuery } from "@/lib/embeddings";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import { searchGuideItemsWithFallback } from "@/lib/guide-items-search";
import type { AppLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";
import type {
  GuideItemChatCardData,
  GuideItemKind,
  GuideItemSearchResult,
} from "@/types/guide-items";
import { tool } from "ai";
import { z } from "zod";

const guideItemKindSchema = z.enum([
  "restaurant",
  "transport",
  "wellness",
  "shopping",
  "museum",
  "activity",
  "other",
]);

const planTripWithGuideItemsSchema = z.object({
  city: z
    .string()
    .min(1)
    .describe('Destination city name or slug, for example "Marrakech".'),
  days: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(2)
    .describe("Number of itinerary days to build."),
  travelers: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Total number of travelers, when known."),
  budgetMad: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "User budget in Moroccan dirhams when stated. Treat as total unless budgetScope says otherwise.",
    ),
  budgetScope: z
    .enum(["total", "per_person", "per_day", "unknown"])
    .optional()
    .default("unknown")
    .describe("How the stated budget should be interpreted."),
  interests: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "User interests such as food, medina, museums, shopping, hammam, family, romantic, budget, nature.",
    ),
  preferredKinds: z
    .array(guideItemKindSchema)
    .optional()
    .describe("Optional guide-item kinds to emphasize."),
  pace: z
    .enum(["relaxed", "balanced", "full"])
    .optional()
    .default("balanced")
    .describe("Trip rhythm. Use balanced unless the user asks otherwise."),
  nearText: z
    .string()
    .optional()
    .describe(
      'Place or neighborhood proximity hint, for example "near Jemaa el-Fna" or "close to my riad".',
    ),
  centerLat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Latitude for near-me/proximity planning, if available."),
  centerLng: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Longitude for near-me/proximity planning, if available."),
  includeRestaurants: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include lunch/dinner restaurant slots."),
  includeTransport: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to fetch transport options/tips."),
});

type PlanTripInput = z.infer<typeof planTripWithGuideItemsSchema>;

type PlanCandidate = {
  id: string;
  slug: string;
  kind: GuideItemKind;
  title: string;
  summary: string | null;
  payment: string | null;
  price_range: string | null;
  currency: string;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  rating_avg: number | null;
  reviews_count: number;
  tags: string[];
  source_url: string | null;
  verified: boolean;
  relevance_score: number | null;
  card: GuideItemChatCardData;
};

type PlanSlot = {
  time: string;
  label: "morning" | "lunch" | "afternoon" | "dinner";
  item: PlanCandidate | null;
  why: string;
};

const TIME_WINDOWS: Record<
  PlanTripInput["pace"],
  Record<PlanSlot["label"], string>
> = {
  relaxed: {
    morning: "10:00-12:30",
    lunch: "13:00-14:30",
    afternoon: "16:00-18:00",
    dinner: "19:30-21:00",
  },
  balanced: {
    morning: "09:30-12:00",
    lunch: "12:30-14:00",
    afternoon: "15:00-17:30",
    dinner: "19:30-21:00",
  },
  full: {
    morning: "09:00-11:30",
    lunch: "12:00-13:30",
    afternoon: "14:30-17:30",
    dinner: "20:00-21:30",
  },
};

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCitySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(
  fromLat: number | undefined,
  fromLng: number | undefined,
  toLat: number | null,
  toLng: number | null,
): number | null {
  if (
    typeof fromLat !== "number" ||
    typeof fromLng !== "number" ||
    typeof toLat !== "number" ||
    typeof toLng !== "number"
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return Number(
    (earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1),
  );
}

function buildSearchQuery({
  city,
  interests,
  nearText,
  budgetMad,
  budgetScope,
  bucket,
}: {
  city: string;
  interests: string[];
  nearText: string | null;
  budgetMad?: number;
  budgetScope: PlanTripInput["budgetScope"];
  bucket: string;
}): string {
  return [
    city,
    bucket,
    ...interests,
    nearText ? `near ${nearText}` : null,
    budgetMad ? `budget ${budgetMad} MAD ${budgetScope}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function candidateFromResult(
  row: GuideItemSearchResult,
  locale: AppLocale,
  centerLat?: number,
  centerLng?: number,
): PlanCandidate {
  const card = mapGuideItemSearchRowToChatCardData(row, locale);

  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind_slug as GuideItemKind,
    title: card.title,
    summary: card.summary || null,
    payment: card.payment || null,
    price_range: row.price_range,
    currency: row.currency,
    address_text: row.address_text,
    lat: row.lat,
    lng: row.lng,
    distance_km: distanceKm(centerLat, centerLng, row.lat, row.lng),
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    tags: row.tags,
    source_url: row.source_url,
    verified: row.verified,
    relevance_score: row.relevance_score,
    card: {
      ...card,
      reviews: card.reviews?.slice(0, 3) ?? [],
    },
  };
}

function rankCandidates(candidates: PlanCandidate[]): PlanCandidate[] {
  return [...candidates].sort((left, right) => {
    const leftDistance = left.distance_km ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.distance_km ?? Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;

    const leftScore = left.relevance_score ?? -1;
    const rightScore = right.relevance_score ?? -1;
    if (rightScore !== leftScore) return rightScore - leftScore;

    if (right.reviews_count !== left.reviews_count) {
      return right.reviews_count - left.reviews_count;
    }

    return (right.rating_avg ?? -1) - (left.rating_avg ?? -1);
  });
}

function takeNext(
  candidates: PlanCandidate[],
  usedIds: Set<string>,
): PlanCandidate | null {
  const candidate = candidates.find((item) => !usedIds.has(item.id));
  if (!candidate) return null;
  usedIds.add(candidate.id);
  return candidate;
}

function whyForSlot(
  item: PlanCandidate | null,
  nearText: string | null,
  budgetMad?: number,
): string {
  if (!item) {
    return "No matching catalog-backed guide item found for this slot.";
  }

  const parts = [item.summary || `${item.kind} option from the local guide`];
  if (item.distance_km !== null) {
    parts.push(`${item.distance_km} km from the reference point`);
  } else if (nearText) {
    parts.push(`selected with the proximity hint "${nearText}"`);
  }
  if (budgetMad && (item.payment || item.price_range)) {
    parts.push("has available price/payment signal to compare with the budget");
  }

  return parts.join("; ");
}

async function searchBucket({
  city,
  citySlug,
  interests,
  nearText,
  budgetMad,
  budgetScope,
  bucket,
  kinds,
  limit,
  locale,
  centerLat,
  centerLng,
}: {
  city: string;
  citySlug: string;
  interests: string[];
  nearText: string | null;
  budgetMad?: number;
  budgetScope: PlanTripInput["budgetScope"];
  bucket: string;
  kinds: GuideItemKind[];
  limit: number;
  locale: AppLocale;
  centerLat?: number;
  centerLng?: number;
}): Promise<PlanCandidate[]> {
  const textQuery = buildSearchQuery({
    city,
    interests,
    nearText,
    budgetMad,
    budgetScope,
    bucket,
  });

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embedQuery(textQuery);
  } catch (error) {
    console.warn(
      "Trip-planning guide item embedding failed, falling back to text search:",
      error,
    );
  }

  const supabase = createServiceRoleClientOrThrow();
  const { results } = await searchGuideItemsWithFallback(supabase, {
    queryEmbedding,
    textQuery,
    citySlug,
    kinds,
    limit,
    minSimilarity: 0.55,
    includeUnpublished: false,
  });

  return rankCandidates(
    results.map((row) =>
      candidateFromResult(row, locale, centerLat, centerLng),
    ),
  );
}

function uniqueCandidates(groups: PlanCandidate[][]): PlanCandidate[] {
  const seen = new Set<string>();
  const output: PlanCandidate[] = [];

  for (const group of groups) {
    for (const candidate of group) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      output.push(candidate);
    }
  }

  return output;
}

export function createPlanTripWithGuideItemsTool(
  defaultLocale: AppLocale = "fr",
) {
  return tool({
    description: `Build a catalog-backed, day-by-day trip itinerary using curated guide_items.
Use this for requests like "I want a 4-day trip to Marrakech", "plan my day under 400 DH", "what should we do near my riad?", or any request for an itinerary with restaurants, activities, museums, shopping, wellness, or transport.
The tool returns structured source items, card data, and a draft schedule for the chat UI. Use only returned item facts for names, prices, addresses, ratings, and proximity. Do not call searchGuideItems just to render itinerary slot cards; the UI renders the returned guide item cards inline.`,
    inputSchema: planTripWithGuideItemsSchema,
    execute: async (input) => {
      try {
        const city = input.city.trim();
        const citySlug = normalizeCitySlug(city);
        const interests =
          input.interests?.map((item) => item.trim()).filter(Boolean) ?? [];
        const nearText = normalizeOptionalString(input.nearText);
        const preferredKinds = input.preferredKinds ?? [];
        const requestedActivityKinds = preferredKinds.filter(
          (kind) => kind !== "restaurant" && kind !== "transport",
        );
        const activityKinds: GuideItemKind[] =
          requestedActivityKinds.length > 0
            ? requestedActivityKinds
            : ["activity", "museum", "shopping", "wellness", "other"];

        const dailyActivityLimit = Math.min(Math.max(input.days * 3, 8), 20);
        const dailyRestaurantLimit = Math.min(Math.max(input.days * 2, 6), 16);

        const [morningItems, afternoonItems, restaurantItems, transportItems] =
          await Promise.all([
            searchBucket({
              city,
              citySlug,
              interests,
              nearText,
              budgetMad: input.budgetMad,
              budgetScope: input.budgetScope,
              bucket: "morning sightseeing activity museum culture",
              kinds: activityKinds,
              limit: dailyActivityLimit,
              locale: defaultLocale,
              centerLat: input.centerLat,
              centerLng: input.centerLng,
            }),
            searchBucket({
              city,
              citySlug,
              interests,
              nearText,
              budgetMad: input.budgetMad,
              budgetScope: input.budgetScope,
              bucket: "afternoon activity shopping wellness local experience",
              kinds: activityKinds,
              limit: dailyActivityLimit,
              locale: defaultLocale,
              centerLat: input.centerLat,
              centerLng: input.centerLng,
            }),
            input.includeRestaurants
              ? searchBucket({
                  city,
                  citySlug,
                  interests,
                  nearText,
                  budgetMad: input.budgetMad,
                  budgetScope: input.budgetScope,
                  bucket: "restaurant lunch dinner food",
                  kinds: ["restaurant"],
                  limit: dailyRestaurantLimit,
                  locale: defaultLocale,
                  centerLat: input.centerLat,
                  centerLng: input.centerLng,
                })
              : Promise.resolve([]),
            input.includeTransport
              ? searchBucket({
                  city,
                  citySlug,
                  interests,
                  nearText,
                  budgetMad: input.budgetMad,
                  budgetScope: input.budgetScope,
                  bucket: "transport taxi transfer getting around",
                  kinds: ["transport"],
                  limit: 4,
                  locale: defaultLocale,
                  centerLat: input.centerLat,
                  centerLng: input.centerLng,
                })
              : Promise.resolve([]),
          ]);

        const windows = TIME_WINDOWS[input.pace];
        const usedIds = new Set<string>();
        const days = Array.from({ length: input.days }, (_, index) => {
          const morning = takeNext(morningItems, usedIds);
          const lunch = takeNext(restaurantItems, usedIds);
          const afternoon = takeNext(afternoonItems, usedIds);
          const dinner = takeNext(restaurantItems, usedIds);

          const slots: PlanSlot[] = [
            {
              time: windows.morning,
              label: "morning",
              item: morning,
              why: whyForSlot(morning, nearText, input.budgetMad),
            },
            {
              time: windows.lunch,
              label: "lunch",
              item: lunch,
              why: whyForSlot(lunch, nearText, input.budgetMad),
            },
            {
              time: windows.afternoon,
              label: "afternoon",
              item: afternoon,
              why: whyForSlot(afternoon, nearText, input.budgetMad),
            },
            {
              time: windows.dinner,
              label: "dinner",
              item: dinner,
              why: whyForSlot(dinner, nearText, input.budgetMad),
            },
          ];

          return {
            day: index + 1,
            slots,
          };
        });

        const sourceItems = uniqueCandidates([
          morningItems,
          afternoonItems,
          restaurantItems,
          transportItems,
        ]);

        return {
          success: true,
          type: "trip_plan",
          city,
          city_slug: citySlug,
          days_requested: input.days,
          travelers: input.travelers ?? null,
          budget_mad: input.budgetMad ?? null,
          budget_scope: input.budgetScope,
          pace: input.pace,
          near_text: nearText,
          accuracy_rules: [
            "Only use returned guide-item facts for names, prices, payment notes, addresses, ratings, and distance.",
            "Do not invent opening hours or exact travel times unless present in item data.",
            "If budget is restrictive and item prices are missing, label the plan as budget-aware but not price-guaranteed.",
            "If important slots have null items, ask one targeted follow-up or explain the catalog gap.",
          ],
          plan: days,
          transport_options: transportItems,
          source_items: sourceItems,
          note:""
            // sourceItems.length > 0
            //   ? "Draft itinerary built from published guide_items."
            //   : "No published guide_items matched this itinerary request.",
        };
      } catch (error) {
        console.error("planTripWithGuideItems tool error:", error);
        return {
          success: false,
          type: "trip_plan",
          plan: [],
          source_items: [],
          error:
            error instanceof Error
              ? error.message
              : "Unexpected trip planning error.",
        };
      }
    },
  });
}

export const planTripWithGuideItems = createPlanTripWithGuideItemsTool();
