import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import {
  normalizeGuideItemCitySlug,
  searchGuideItemsWithFallback,
} from "@/lib/guide-items-search";
import type { AppLocale } from "@/lib/i18n";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";
import {
  GUIDE_ITEM_KINDS,
  type GuideItemChatCardData,
  type GuideItemKind,
  type GuideItemSearchResult,
} from "@/types/guide-items";

const guideItemKindSchema = z.enum(GUIDE_ITEM_KINDS);

const travelPartySchema = z.enum([
  "solo",
  "couple",
  "family",
  "friends",
  "group",
  "business",
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
  travelParty: travelPartySchema
    .optional()
    .describe(
      "Trip party type when known, for example solo, couple, family, friends, group, or business.",
    ),
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
    .describe(
      "Legacy restaurant switch. Meals are included by default unless the user asks to exclude meals.",
    ),
  includeBreakfast: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Include breakfast slots by default unless the user explicitly excludes breakfast or asks for activity-only planning.",
    ),
  includeLunch: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Include lunch slots by default unless the user explicitly excludes lunch or asks for activity-only planning.",
    ),
  includeDinner: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Include dinner slots by default unless the user explicitly excludes dinner or asks for activity-only planning.",
    ),
  includeTransport: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to fetch transport options/tips."),
});

type PlanTripInput = z.infer<typeof planTripWithGuideItemsSchema>;

type TrustedUserLocation = {
  lat: number;
  lng: number;
};

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

type PlanItem = {
  item: PlanCandidate | null;
  why: string;
};

type DailyPlanStepKind = "activity" | "breakfast" | "lunch" | "dinner";

const DAILY_ACTIVITY_COUNTS: Record<PlanTripInput["pace"], number> = {
  relaxed: 2,
  balanced: 3,
  full: 4,
};

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCitySlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizeGuideItemCitySlug(slug) ?? slug;
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
  travelParty,
  bucket,
}: {
  city: string;
  interests: string[];
  nearText: string | null;
  budgetMad?: number;
  budgetScope: PlanTripInput["budgetScope"];
  travelParty?: PlanTripInput["travelParty"];
  bucket: string;
}): string {
  return [
    city,
    bucket,
    ...interests,
    travelParty ? `${travelParty} trip` : null,
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
    card,
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

function normalizeCandidateToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCandidateSignature(candidate: PlanCandidate): string {
  const slug = normalizeCandidateToken(candidate.slug);
  if (slug) return `${candidate.kind}:${slug}`;

  const title = normalizeCandidateToken(candidate.title);
  const address = normalizeCandidateToken(candidate.address_text);
  return `${candidate.kind}:${title}:${address}`;
}

const GENERIC_ACTIVITY_TOKENS = new Set([
  "activity",
  "activities",
  "experience",
  "experiences",
  "place",
  "places",
  "tour",
  "tours",
  "visit",
  "visits",
  "morocco",
  "moroccan",
  "marrakech",
  "essaouira",
  "agadir",
  "casablanca",
  "rabat",
  "fes",
  "fez",
  "tangier",
  "local",
  "guide",
  "guided",
  "restaurant",
  "restaurants",
  "cafe",
  "coffee",
  "food",
  "breakfast",
  "lunch",
  "dinner",
  "near",
  "best",
  "top",
  "the",
  "and",
  "for",
  "with",
  "dans",
  "avec",
  "pour",
  "les",
  "des",
  "une",
]);

function getCandidateTopicTokens(candidate: PlanCandidate): Set<string> {
  const text = normalizeCandidateToken(candidate.title);
  const tokens = text
    .split(" ")
    .filter(
      (token) =>
        token.length >= 4 &&
        !GENERIC_ACTIVITY_TOKENS.has(token) &&
        !/^\d+$/.test(token),
    );

  return new Set(tokens);
}

function hasSameDayTopicOverlap(
  candidate: PlanCandidate,
  usedDayTopicTokens: Set<string>,
): boolean {
  for (const token of getCandidateTopicTokens(candidate)) {
    if (usedDayTopicTokens.has(token)) return true;
  }

  return false;
}

function rememberDayTopic(
  candidate: PlanCandidate,
  usedDayTopicTokens: Set<string>,
) {
  for (const token of getCandidateTopicTokens(candidate)) {
    usedDayTopicTokens.add(token);
  }
}

function takeNext(
  candidates: PlanCandidate[],
  usedSignatures: Set<string>,
  usedDayTopicTokens?: Set<string>,
  avoidSameDayTopic = false,
): PlanCandidate | null {
  const candidate = candidates.find(
    (item) =>
      !usedSignatures.has(getCandidateSignature(item)) &&
      (!avoidSameDayTopic ||
        !usedDayTopicTokens ||
        !hasSameDayTopicOverlap(item, usedDayTopicTokens)),
  );
  if (!candidate) return null;
  usedSignatures.add(getCandidateSignature(candidate));
  if (usedDayTopicTokens) {
    rememberDayTopic(candidate, usedDayTopicTokens);
  }
  return candidate;
}

function buildDailyTemplate(
  pace: PlanTripInput["pace"],
  mealSteps: Exclude<DailyPlanStepKind, "activity">[],
): DailyPlanStepKind[] {
  const activityCount = DAILY_ACTIVITY_COUNTS[pace];
  const steps: DailyPlanStepKind[] = [];
  const lunchIndex = activityCount > 2 ? 1 : 0;

  if (mealSteps.includes("breakfast")) {
    steps.push("breakfast");
  }

  for (let index = 0; index < activityCount; index += 1) {
    steps.push("activity");
    if (mealSteps.includes("lunch") && index === lunchIndex) {
      steps.push("lunch");
    }
  }

  if (mealSteps.includes("dinner")) {
    steps.push("dinner");
  }

  return steps;
}

function whyForPlanItem(
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

function interleaveCandidates(groups: PlanCandidate[][]): PlanCandidate[] {
  const seen = new Set<string>();
  const output: PlanCandidate[] = [];
  const maxLength = Math.max(...groups.map((group) => group.length), 0);

  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const candidate = group[index];
      if (!candidate) continue;

      const signature = getCandidateSignature(candidate);
      if (seen.has(signature)) continue;
      seen.add(signature);
      output.push(candidate);
    }
  }

  return output;
}

async function searchBucket({
  city,
  citySlug,
  interests,
  nearText,
  budgetMad,
  budgetScope,
  travelParty,
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
  travelParty?: PlanTripInput["travelParty"];
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
    travelParty,
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
    minSimilarity: 0.35,
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
      const signature = getCandidateSignature(candidate);
      if (seen.has(signature)) continue;
      seen.add(signature);
      output.push(candidate);
    }
  }

  return output;
}

export function createPlanTripWithGuideItemsTool(
  defaultLocale: AppLocale = "fr",
  trustedUserLocation: TrustedUserLocation | null = null,
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
        const distanceReference = trustedUserLocation ? "user_location" : null;
        const centerLat = trustedUserLocation?.lat;
        const centerLng = trustedUserLocation?.lng;
        const mealSteps: Exclude<DailyPlanStepKind, "activity">[] = [
          input.includeBreakfast ? "breakfast" : null,
          input.includeLunch ? "lunch" : null,
          input.includeDinner ? "dinner" : null,
        ].filter((step): step is Exclude<DailyPlanStepKind, "activity"> =>
          Boolean(step),
        );
        const requestedActivityKinds = preferredKinds.filter(
          (kind) =>
            ![
              "restaurant",
              "coffee",
              "bakery",
              "rooftop",
              "pub",
              "transport",
              "parking",
              "pharmacy",
              "money_exchange",
              "tourist_info",
            ].includes(kind),
        );
        const activityKinds: GuideItemKind[] =
          requestedActivityKinds.length > 0
            ? requestedActivityKinds
            : [
                "activity",
                "museum",
                "shopping",
                "wellness",
                "nightlife",
                "beach",
                "nature",
                "viewpoint",
                "market",
                "family",
                "religious",
                "coworking",
                "other",
              ];

        // Fetch with margin: global signature dedup (an item can only be used
        // once per trip, across all buckets) shrinks effective pools below
        // the raw limits, which previously left plan slots empty.
        const dailyActivityLimit = Math.min(
          Math.max(input.days * 4 + 4, 10),
          30,
        );
        const dailyMealLimit = Math.min(Math.max(input.days + 4, 8), 16);

        const [
          morningItems,
          afternoonItems,
          breakfastItems,
          lunchItems,
          dinnerItems,
          transportItems,
        ] = await Promise.all([
          searchBucket({
            city,
            citySlug,
            interests,
            nearText,
            budgetMad: input.budgetMad,
            budgetScope: input.budgetScope,
            travelParty: input.travelParty,
            bucket: "morning sightseeing activity museum culture",
            kinds: activityKinds,
            limit: dailyActivityLimit,
            locale: defaultLocale,
            centerLat,
            centerLng,
          }),
          searchBucket({
            city,
            citySlug,
            interests,
            nearText,
            budgetMad: input.budgetMad,
            budgetScope: input.budgetScope,
            travelParty: input.travelParty,
            bucket: "afternoon activity shopping wellness local experience",
            kinds: activityKinds,
            limit: dailyActivityLimit,
            locale: defaultLocale,
            centerLat,
            centerLng,
          }),
          input.includeBreakfast
            ? searchBucket({
                city,
                citySlug,
                interests,
                nearText,
                budgetMad: input.budgetMad,
                budgetScope: input.budgetScope,
                travelParty: input.travelParty,
                bucket: "restaurant cafe breakfast brunch morning food",
                kinds: ["restaurant", "coffee", "bakery", "rooftop"],
                limit: dailyMealLimit,
                locale: defaultLocale,
                centerLat,
                centerLng,
              })
            : Promise.resolve([]),
          input.includeLunch
            ? searchBucket({
                city,
                citySlug,
                interests,
                nearText,
                budgetMad: input.budgetMad,
                budgetScope: input.budgetScope,
                travelParty: input.travelParty,
                bucket: "restaurant lunch casual local food midday",
                kinds: ["restaurant", "coffee", "bakery", "rooftop"],
                limit: dailyMealLimit,
                locale: defaultLocale,
                centerLat,
                centerLng,
              })
            : Promise.resolve([]),
          input.includeDinner
            ? searchBucket({
                city,
                citySlug,
                interests,
                nearText,
                budgetMad: input.budgetMad,
                budgetScope: input.budgetScope,
                travelParty: input.travelParty,
                bucket:
                  "restaurant dinner rooftop romantic traditional food evening",
                kinds: ["restaurant", "rooftop", "pub"],
                limit: dailyMealLimit,
                locale: defaultLocale,
                centerLat,
                centerLng,
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
                travelParty: input.travelParty,
                bucket: "transport taxi transfer getting around",
                kinds: ["transport"],
                limit: 4,
                locale: defaultLocale,
                centerLat,
                centerLng,
              })
            : Promise.resolve([]),
        ]);

        const activityItems = interleaveCandidates([
          morningItems,
          afternoonItems,
        ]);
        const mealItemsByStep = {
          breakfast: breakfastItems,
          lunch: lunchItems,
          dinner: dinnerItems,
        } satisfies Record<
          Exclude<DailyPlanStepKind, "activity">,
          PlanCandidate[]
        >;
        const dailyTemplate = buildDailyTemplate(input.pace, mealSteps);
        // Cross-meal-bucket reserve pool: any unused restaurant/cafe can fill
        // a breakfast, lunch, or dinner slot whose dedicated bucket ran dry.
        const mealLeftovers = uniqueCandidates([
          breakfastItems,
          lunchItems,
          dinnerItems,
        ]);
        const usedSignatures = new Set<string>();
        const days = Array.from({ length: input.days }, (_, index) => {
          const usedDayTopicTokens = new Set<string>();
          const items: PlanItem[] = dailyTemplate.map((stepKind) => {
            const nextItem =
              stepKind === "activity"
                ? takeNext(
                    activityItems,
                    usedSignatures,
                    usedDayTopicTokens,
                    true,
                  )
                : (takeNext(mealItemsByStep[stepKind], usedSignatures) ??
                  takeNext(mealLeftovers, usedSignatures));

            return {
              item: nextItem,
              why: whyForPlanItem(nextItem, nearText, input.budgetMad),
            };
          });

          return {
            day: index + 1,
            items,
          };
        });

        const sourceItems = uniqueCandidates([
          morningItems,
          afternoonItems,
          breakfastItems,
          lunchItems,
          dinnerItems,
          transportItems,
        ]);

        return {
          success: true,
          type: "trip_plan",
          city,
          city_slug: citySlug,
          days_requested: input.days,
          travelers: input.travelers ?? null,
          travel_party: input.travelParty ?? null,
          budget_mad: input.budgetMad ?? null,
          budget_scope: input.budgetScope,
          pace: input.pace,
          near_text: nearText,
          distance_reference: distanceReference,
          accuracy_rules: [
            "Only use returned guide-item facts for names, prices, payment notes, addresses, ratings, and distance.",
            "Do not invent opening hours or exact travel times unless present in item data.",
            "If budget is restrictive and item prices are missing, label the plan as budget-aware but not price-guaranteed.",
            "Breakfast, lunch, and dinner are included by default unless the user explicitly excluded that meal or asked for activity-only planning.",
            "Do not propose the same guide item twice in the same day; avoid same-day near-duplicates by activity topic/name.",
            "If important plan items have null results, ask one targeted follow-up or explain the catalog gap.",
          ],
          plan: days,
          transport_options: transportItems,
          source_items: sourceItems,
          note: "",
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
