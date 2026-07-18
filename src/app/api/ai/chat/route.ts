import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { AgentToolName } from "@/lib/ai/agent-config";
import { loadAgentRuntimeConfig } from "@/lib/ai/agent-config";
import { loadCatalogContext } from "@/lib/ai/catalog-context";
import {
  getDestinationClarificationOptions,
  getDestinationClarificationQuestion,
  getGreetingQuickReplyOptions,
  getGreetingWelcomeText,
  getLanguageDisplayName,
  normalizeSupportedLanguage,
} from "@/lib/ai/chat-language";
import { aiDebug } from "@/lib/ai/debug-log";
import { buildAgentPromptFromConfig } from "@/lib/ai/prompt-builder";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import {
  checkAvailability,
  createBookingIntent,
  createOfferQuickRepliesTool,
  createPlanTripWithGuideItemsTool,
  createSearchGuideItemsTool,
  createSelectRoomTypeTool,
  createSuggestDateOptionsTool,
  findSimilar,
  getCityInformation,
  getExperienceDetails,
  getExperienceOptionDetails,
  getExperiencePromos,
  getLinkedExperiences,
  getTopicInformation,
  getWeather,
  requestUserLocation,
  searchExperiences,
  validatePromoCode,
} from "@/lib/ai/tools";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { getPostHogClient } from "@/lib/analytics/posthog-server";
import {
  CHAT_DEEP_LINK_BOOTSTRAP_MESSAGE,
  type ChatDeepLinkRequestBody,
} from "@/lib/chat/deep-link";
import { getLowestPricedRoom } from "@/lib/experience-pricing";
import { type AppLocale, getLocalizedDescription } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { createClient } from "@/lib/supabase/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const MODEL_HISTORY_CHAR_BUDGET = 24_000;
const MODEL_HISTORY_MAX_MESSAGES = 18;
const MODEL_MESSAGE_MAX_CHARS = 3_000;
const MODEL_TOOL_SUMMARY_MAX_CHARS = 1_800;
const MODEL_TOOL_SUMMARY_MAX_ITEMS = 8;

function dedupeInputMessages(rawMessages: unknown[]) {
  const deduped: unknown[] = [];
  const seenIds = new Set<string>();
  let previousSignature = "";

  for (const rawMessage of rawMessages) {
    if (!rawMessage || typeof rawMessage !== "object") continue;

    const message = rawMessage as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
      parts?: unknown;
    };

    const id = typeof message.id === "string" ? message.id : null;
    if (id && seenIds.has(id)) {
      continue;
    }

    const role = typeof message.role === "string" ? message.role : "";
    const content =
      typeof message.content === "string" ? message.content.trim() : "";
    const parts =
      Array.isArray(message.parts) && message.parts.length > 0
        ? JSON.stringify(message.parts)
        : "";

    // Drop accidental adjacent duplicates caused by client rehydration races.
    const signature = `${role}|${content}|${parts}`;
    if (signature === previousSignature) {
      continue;
    }

    previousSignature = signature;
    if (id) seenIds.add(id);
    deduped.push(rawMessage);
  }

  return deduped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function supportsTemperature(model: string): boolean {
  // Reasoning families currently ignore or reject temperature.
  return !/^(gpt-5|o1|o3|o4)([-.:]|$)/i.test(model);
}

function isTruthyEnvVar(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function extractRecentEntityContext(rawMessages: unknown[]): {
  promptBlock: string;
  roomHintsCount: number;
  experienceHintsCount: number;
} {
  const roomHints: Array<{
    experienceId: string;
    experienceTitle: string;
    roomTypeId: string;
    roomName: string;
  }> = [];
  const experienceHints: Array<{
    experienceId: string;
    title: string;
    type: string;
    city: string;
    region: string;
  }> = [];

  for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
    const message = rawMessages[i];
    if (!isRecord(message) || !Array.isArray(message.parts)) continue;

    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const rawPart = message.parts[j];
      if (!isRecord(rawPart)) continue;
      if (rawPart.state !== "output-available") continue;
      if (!isRecord(rawPart.output) || rawPart.output.success !== true)
        continue;

      if (rawPart.type === "tool-selectRoomType") {
        const output = rawPart.output;
        const experience = isRecord(output.experience)
          ? output.experience
          : null;
        const experienceId =
          experience && typeof experience.id === "string" ? experience.id : "";
        const experienceTitle =
          experience && typeof experience.title === "string"
            ? experience.title
            : "Unknown experience";
        const experienceType =
          experience && typeof experience.type === "string"
            ? experience.type
            : "lodging";
        const experienceCity =
          experience && typeof experience.city === "string"
            ? experience.city
            : "";
        const experienceRegion =
          experience && typeof experience.region === "string"
            ? experience.region
            : "";

        if (!experienceId || !Array.isArray(output.rooms)) continue;
        experienceHints.push({
          experienceId,
          title: experienceTitle,
          type: experienceType,
          city: experienceCity,
          region: experienceRegion,
        });
        for (const room of output.rooms) {
          if (!isRecord(room)) continue;
          if (
            typeof room.room_type_id !== "string" ||
            typeof room.name !== "string"
          ) {
            continue;
          }
          roomHints.push({
            experienceId,
            experienceTitle,
            roomTypeId: room.room_type_id,
            roomName: room.name,
          });
        }
      }

      if (rawPart.type === "tool-getExperienceDetails") {
        const output = rawPart.output;
        const experience = isRecord(output.experience)
          ? output.experience
          : null;
        const experienceId =
          experience && typeof experience.id === "string" ? experience.id : "";
        const experienceTitle =
          experience && typeof experience.title === "string"
            ? experience.title
            : "Unknown experience";
        const experienceType =
          experience && typeof experience.type === "string"
            ? experience.type
            : "";
        const experienceCity =
          experience && typeof experience.city === "string"
            ? experience.city
            : "";
        const experienceRegion =
          experience && typeof experience.region === "string"
            ? experience.region
            : "";

        if (!experienceId) continue;
        experienceHints.push({
          experienceId,
          title: experienceTitle,
          type: experienceType,
          city: experienceCity,
          region: experienceRegion,
        });
        if (!Array.isArray(output.room_types)) continue;
        for (const room of output.room_types) {
          if (!isRecord(room) || typeof room.id !== "string") continue;
          const roomName =
            typeof room.name === "string"
              ? room.name
              : typeof room.type === "string"
                ? room.type
                : "Room";
          roomHints.push({
            experienceId,
            experienceTitle,
            roomTypeId: room.id,
            roomName,
          });
        }
      }

      if (rawPart.type === "tool-searchExperiences") {
        const output = rawPart.output;
        if (!Array.isArray(output.results)) continue;
        for (const result of output.results) {
          if (!isRecord(result)) continue;
          if (typeof result.id !== "string") continue;
          experienceHints.push({
            experienceId: result.id,
            title: typeof result.title === "string" ? result.title : "Unknown",
            type: typeof result.type === "string" ? result.type : "",
            city: typeof result.city === "string" ? result.city : "",
            region: typeof result.region === "string" ? result.region : "",
          });

          if (result.type !== "lodging") continue;
          if (!Array.isArray(result.rooms)) continue;
          for (const room of result.rooms) {
            if (!isRecord(room)) continue;
            if (
              typeof room.room_type_id !== "string" ||
              typeof room.name !== "string"
            ) {
              continue;
            }
            roomHints.push({
              experienceId: result.id,
              experienceTitle:
                typeof result.title === "string"
                  ? result.title
                  : "Unknown experience",
              roomTypeId: room.room_type_id,
              roomName: room.name,
            });
          }
        }
      }
    }

    if (roomHints.length >= 8 && experienceHints.length >= 8) break;
  }

  const dedupedExperiences: typeof experienceHints = [];
  const seenExperienceIds = new Set<string>();
  for (const hint of experienceHints) {
    if (seenExperienceIds.has(hint.experienceId)) continue;
    seenExperienceIds.add(hint.experienceId);
    dedupedExperiences.push(hint);
    if (dedupedExperiences.length >= 8) break;
  }

  const deduped: typeof roomHints = [];
  const seen = new Set<string>();
  for (const hint of roomHints) {
    if (seen.has(hint.roomTypeId)) continue;
    seen.add(hint.roomTypeId);
    deduped.push(hint);
    if (deduped.length >= 6) break;
  }

  if (deduped.length === 0 && dedupedExperiences.length === 0) {
    return {
      promptBlock: "",
      roomHintsCount: 0,
      experienceHintsCount: 0,
    };
  }

  const lines = ["", "", "## RECENT ENTITY CONTEXT"];

  if (dedupedExperiences.length > 0) {
    lines.push(
      "If user asks for details about an experience by name, use these exact experience_ids:",
    );
    lines.push(
      ...dedupedExperiences.map((hint) => {
        const location = [hint.city, hint.region].filter(Boolean).join(", ");
        return `- ${hint.title} (experience_id: ${hint.experienceId}, type: ${hint.type || "unknown"}${location ? `, location: ${location}` : ""})`;
      }),
    );
  }

  if (deduped.length > 0) {
    const primary = deduped[0];
    lines.push(
      'If user refers to "this room" or room name, resolve with these room_type_ids first:',
    );
    lines.push(
      `- Last lodging: "${primary.experienceTitle}" (experience_id: ${primary.experienceId})`,
    );
    lines.push(
      ...deduped.map(
        (hint) =>
          `- ${hint.roomName} (room_type_id: ${hint.roomTypeId}, experience_id: ${hint.experienceId})`,
      ),
    );
  }

  return {
    promptBlock: lines.join("\n"),
    roomHintsCount: deduped.length,
    experienceHintsCount: dedupedExperiences.length,
  };
}

function extractDeepLinkRequest(
  rawDeepLink: unknown,
): ChatDeepLinkRequestBody | null {
  if (!isRecord(rawDeepLink)) return null;
  if (
    typeof rawDeepLink.experienceId !== "string" ||
    rawDeepLink.experienceId.trim().length === 0
  ) {
    return null;
  }

  return {
    experienceId: rawDeepLink.experienceId.trim(),
    experienceSlug:
      typeof rawDeepLink.experienceSlug === "string" &&
      rawDeepLink.experienceSlug.trim().length > 0
        ? rawDeepLink.experienceSlug.trim()
        : null,
    promo:
      typeof rawDeepLink.promo === "string" &&
      rawDeepLink.promo.trim().length > 0
        ? rawDeepLink.promo.trim()
        : null,
    checkin:
      typeof rawDeepLink.checkin === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(rawDeepLink.checkin.trim())
        ? rawDeepLink.checkin.trim()
        : null,
    nights:
      typeof rawDeepLink.nights === "number" &&
      Number.isFinite(rawDeepLink.nights) &&
      rawDeepLink.nights > 0
        ? Math.min(Math.trunc(rawDeepLink.nights), 30)
        : null,
    utmSource:
      typeof rawDeepLink.utmSource === "string" &&
      rawDeepLink.utmSource.trim().length > 0
        ? rawDeepLink.utmSource.trim()
        : null,
    utmMedium:
      typeof rawDeepLink.utmMedium === "string" &&
      rawDeepLink.utmMedium.trim().length > 0
        ? rawDeepLink.utmMedium.trim()
        : null,
    utmCampaign:
      typeof rawDeepLink.utmCampaign === "string" &&
      rawDeepLink.utmCampaign.trim().length > 0
        ? rawDeepLink.utmCampaign.trim()
        : null,
  };
}

function getMessageRole(rawMessage: unknown): string {
  if (!isRecord(rawMessage)) return "";
  return typeof rawMessage.role === "string" ? rawMessage.role : "";
}

function getMessageText(rawMessage: unknown): string {
  if (!isRecord(rawMessage)) return "";

  if (typeof rawMessage.content === "string") {
    return rawMessage.content.trim();
  }

  if (!Array.isArray(rawMessage.parts)) return "";

  return rawMessage.parts
    .map((part) => {
      if (!isRecord(part)) return "";
      if (part.type !== "text") return "";
      return typeof part.text === "string" ? part.text : "";
    })
    .filter((text) => text.trim().length > 0)
    .join("\n")
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = (
    lastSpace > maxLength * 0.75 ? slice.slice(0, lastSpace) : slice
  ).trimEnd();
  return `${trimmed}…`;
}

function getToolNameFromPart(part: Record<string, unknown>): string {
  const type = part.type;
  if (typeof type !== "string" || !type.startsWith("tool-")) {
    return "tool";
  }

  return type.slice(5);
}

function compactLocation(value: Record<string, unknown>): string {
  return [value.city, value.region]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(", ");
}

function summarizeNamedRecord(
  value: unknown,
  fallbackLabel: string,
): string | null {
  if (!isRecord(value)) return null;

  const title =
    typeof value.title === "string"
      ? value.title
      : typeof value.name === "string"
        ? value.name
        : fallbackLabel;
  const id =
    typeof value.id === "string"
      ? value.id
      : typeof value.experience_id === "string"
        ? value.experience_id
        : null;
  const type = typeof value.type === "string" ? value.type : null;
  const location = compactLocation(value);
  const details = [
    id ? `id: ${id}` : null,
    type ? `type: ${type}` : null,
    location ? `location: ${location}` : null,
  ].filter(Boolean);

  return `${title}${details.length > 0 ? ` (${details.join(", ")})` : ""}`;
}

function summarizeToolOutput(toolName: string, output: unknown): string | null {
  if (!isRecord(output)) return null;

  if (output.success === false) {
    const error =
      typeof output.error === "string"
        ? output.error
        : typeof output.message === "string"
          ? output.message
          : "failed";
    return `${toolName}: ${truncateText(error, 240)}`;
  }

  const listCandidates = [
    output.results,
    output.experiences,
    output.items,
    output.room_types,
    output.rooms,
    output.options,
  ];
  const firstList = listCandidates.find(Array.isArray);
  if (Array.isArray(firstList) && firstList.length > 0) {
    const rows = firstList
      .slice(0, MODEL_TOOL_SUMMARY_MAX_ITEMS)
      .map((item, index) => summarizeNamedRecord(item, `item ${index + 1}`))
      .filter((item): item is string => Boolean(item));

    if (rows.length > 0) {
      return [
        `${toolName} displayed ${firstList.length} item(s):`,
        ...rows.map((row, index) => `${index + 1}. ${row}`),
      ].join("\n");
    }
  }

  if (isRecord(output.experience)) {
    const experience = summarizeNamedRecord(output.experience, "experience");
    if (experience) return `${toolName}: ${experience}`;
  }

  if (isRecord(output.summary)) {
    return `${toolName}: ${truncateText(JSON.stringify(output.summary), 600)}`;
  }

  return `${toolName}: ${truncateText(JSON.stringify(output), 600)}`;
}

function buildCompactAssistantText(rawMessage: unknown): string {
  if (!isRecord(rawMessage)) return "";

  const text = getMessageText(rawMessage);
  if (!Array.isArray(rawMessage.parts)) return text;

  const toolSummaries = rawMessage.parts
    .map((part) => {
      if (!isRecord(part)) return null;
      if (part.state !== "output-available") return null;
      return summarizeToolOutput(getToolNameFromPart(part), part.output);
    })
    .filter((summary): summary is string => Boolean(summary));

  if (toolSummaries.length === 0) return text;

  return [text, ...toolSummaries.map((summary) => `[${summary}]`)]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

function buildModelHistoryMessages(rawMessages: unknown[]) {
  const compactMessages = rawMessages
    .map((message, index) => {
      const role = getMessageRole(message);
      if (role !== "user" && role !== "assistant" && role !== "system") {
        return null;
      }

      const text =
        role === "assistant"
          ? buildCompactAssistantText(message)
          : getMessageText(message);
      const compactText = truncateText(
        text,
        role === "assistant"
          ? MODEL_MESSAGE_MAX_CHARS + MODEL_TOOL_SUMMARY_MAX_CHARS
          : MODEL_MESSAGE_MAX_CHARS,
      );

      if (!compactText) return null;

      return {
        id:
          isRecord(message) && typeof message.id === "string"
            ? message.id
            : `compact-${index}`,
        role,
        parts: [{ type: "text" as const, text: compactText }],
        charLength: compactText.length,
      };
    })
    .filter((message): message is NonNullable<typeof message> =>
      Boolean(message),
    );

  const selectedReversed: typeof compactMessages = [];
  let charTotal = 0;

  for (let i = compactMessages.length - 1; i >= 0; i -= 1) {
    const message = compactMessages[i];
    const nextCharTotal = charTotal + message.charLength;

    if (
      selectedReversed.length >= MODEL_HISTORY_MAX_MESSAGES ||
      nextCharTotal > MODEL_HISTORY_CHAR_BUDGET
    ) {
      break;
    }

    selectedReversed.push(message);
    charTotal = nextCharTotal;
  }

  const selected = selectedReversed.reverse();

  return {
    messages: selected.map(
      ({ charLength: _charLength, ...message }) => message,
    ),
    originalMessagesCount: compactMessages.length,
    compactedMessagesCount: selected.length,
    compactedCharLength: charTotal,
  };
}

function isDeepLinkBootstrapMessage(rawMessage: unknown): boolean {
  if (getMessageRole(rawMessage) !== "user") return false;
  return getMessageText(rawMessage) === CHAT_DEEP_LINK_BOOTSTRAP_MESSAGE;
}

function isFirstVisibleUserTurn(rawMessages: unknown[]): boolean {
  let visibleUserMessageCount = 0;

  for (const message of rawMessages) {
    if (getMessageRole(message) !== "user") continue;
    if (isDeepLinkBootstrapMessage(message)) continue;
    visibleUserMessageCount += 1;
    if (visibleUserMessageCount > 1) return false;
  }

  return visibleUserMessageCount === 1;
}

function buildFirstUserTurnWelcomeContext(
  language: ReturnType<typeof normalizeSupportedLanguage>,
  welcomeText: string,
): string {
  const yesByLanguage = {
    fr: '"oui"',
    en: '"yes"',
    ar: '"نعم"',
  } satisfies Record<ReturnType<typeof normalizeSupportedLanguage>, string>;

  return [
    "",
    "",
    "## FIRST USER TURN WELCOME CONTEXT",
    "This is the first visible user message in this conversation.",
    "Before the user typed, the UI showed this localized welcome text:",
    welcomeText
      .split("\\n")
      .map((line) => `- ${line}`)
      .join("\n"),
    `If the user's first message is a short affirmation like ${yesByLanguage[language]}, "oui", "yes", "ok", or "نعم", interpret it as accepting the quick Essaouira test from that welcome text.`,
    "Use that test preset ONLY when the entire user message is a short standalone affirmation. If the message names a destination, category, place, preference, or any concrete request, handle that request normally and never use the preset.",
    'For that affirmation case, you MUST call searchGuideItems exactly once with preset="essaouira_intro_mix". Do not call offerQuickReplies or any other recommendation tool.',
    "The tool generates the localized introduction. Do not output any separate assistant text, repeat or paraphrase the welcome, list or describe the recommendations, or ask a question.",
    "Do not ask what they mean by the affirmation.",
  ].join("\n");
}

async function buildDeepLinkPromptBlock(
  deepLink: ChatDeepLinkRequestBody,
  locale: AppLocale,
): Promise<string> {
  const data = await fetchExperienceData(deepLink.experienceId, locale);
  const experience = data?.transformed;
  if (!experience) return "";

  const lowestPricedRoom = getLowestPricedRoom(experience.lodging?.rooms);
  const priceCents =
    experience.trip?.price_cents ?? lowestPricedRoom?.price_cents;
  const currency =
    experience.trip?.currency ?? lowestPricedRoom?.currency ?? "MAD";
  const startingPrice =
    typeof priceCents === "number"
      ? `${Math.round(priceCents / 100)} ${currency}`
      : "unknown";
  const rating =
    typeof experience.metrics.rating === "number"
      ? experience.metrics.rating.toFixed(1)
      : "unknown";
  const location = [experience.city, experience.region, experience.country]
    .filter(Boolean)
    .join(", ");
  const description =
    getLocalizedDescription(experience, locale, "short") ||
    getLocalizedDescription(experience, locale, "long");
  const highlights = experience.amenities
    .map((amenity) => amenity.label)
    .filter((label) => label.trim().length > 0)
    .slice(0, 5);

  const bookingQuestion =
    locale === "ar"
      ? "هل تريد أن أساعدك في الحجز؟ أخبرني بتاريخ الوصول وعدد الليالي."
      : locale === "en"
        ? "Would you like me to help with the booking? Tell me your dates and I'll take care of the rest."
        : "Vous souhaitez que je vous aide à réserver ? Dites-moi vos dates et je m'occupe du reste.";

  const lines = [
    "",
    "",
    "## EXPERIENCE DEEP LINK CONTEXT",
    `The chat was opened from a deep link or paid campaign for one exact experience: "${experience.title}".`,
    `If the latest user message is exactly "${CHAT_DEEP_LINK_BOOTSTRAP_MESSAGE}", it is an internal invisible trigger. Never mention or acknowledge that token.`,
    "On your next response:",
    "- Start proactively without asking what the user wants.",
    "- Focus on this exact experience first before suggesting alternatives.",
    "- Do not call searchExperiences, getExperienceDetails, or getLinkedExperiences on this first bootstrap response just to repeat the same experience card. That experience card is already visible in the UI.",
    "- Respond in the requested conversation language.",
    "- Mention the name, location, starting price if known, rating if known, and 2-3 standout highlights from the verified data below.",
    "- If a promo code exists, mention that the user arrived with that code, but do not invent the discount amount unless it is already verified.",
    "- If tentative dates or nights exist, mention them as context only. Do not claim availability until it is checked.",
    "- End with exactly one booking-oriented question.",
    `Preferred ending: "${bookingQuestion}"`,
    "",
    "Verified experience data:",
    `- experience_id: ${experience.id}`,
    `- experience_slug: ${experience.slug ?? deepLink.experienceSlug ?? "unknown"}`,
    `- title: ${experience.title}`,
    `- type: ${experience.type}`,
    `- location: ${location || "unknown"}`,
    `- starting_price: ${startingPrice}`,
    `- rating: ${rating}`,
    `- reviews: ${experience.metrics.reviews}`,
    `- description: ${description || "unknown"}`,
    `- highlights: ${highlights.length > 0 ? highlights.join(", ") : "unknown"}`,
  ];

  if (deepLink.promo) {
    lines.push(`- promo_code: ${deepLink.promo}`);
  }

  if (deepLink.checkin) {
    lines.push(`- tentative_checkin: ${deepLink.checkin}`);
  }

  if (deepLink.nights) {
    lines.push(`- tentative_nights: ${deepLink.nights}`);
  }

  if (deepLink.utmSource || deepLink.utmMedium || deepLink.utmCampaign) {
    lines.push(
      `- acquisition: source=${deepLink.utmSource ?? "unknown"}, medium=${deepLink.utmMedium ?? "unknown"}, campaign=${deepLink.utmCampaign ?? "unknown"}`,
    );
  }

  return lines.join("\n");
}

function getTrustedUserLocation(
  value: unknown,
): { lat: number; lng: number } | null {
  if (!value || typeof value !== "object") return null;

  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export async function POST(req: Request) {
  try {
    const requestId = crypto.randomUUID().slice(0, 8);
    const {
      messages = [],
      sessionId,
      userLocation,
      configVersionId,
      language,
      deepLink,
    } = await req.json();
    const safeMessages = dedupeInputMessages(
      Array.isArray(messages) ? messages : [],
    );
    const requestedLanguage = normalizeSupportedLanguage(language);
    const deepLinkRequest = extractDeepLinkRequest(deepLink);
    const trustedUserLocation = getTrustedUserLocation(userLocation);

    aiDebug("chat.route", "request_received", {
      requestId,
      sessionId: typeof sessionId === "string" ? sessionId : null,
      configVersionId:
        typeof configVersionId === "string" ? configVersionId : null,
      language: requestedLanguage,
      rawMessagesCount: Array.isArray(messages) ? messages.length : 0,
      dedupedMessagesCount: safeMessages.length,
    });

    const agentConfig = await loadAgentRuntimeConfig({
      overrideVersionId:
        typeof configVersionId === "string" ? configVersionId : null,
    });

    const offerQuickReplies = createOfferQuickRepliesTool(requestedLanguage);
    const planTripWithGuideItems = createPlanTripWithGuideItemsTool(
      requestedLanguage,
      trustedUserLocation,
    );
    const searchGuideItems = createSearchGuideItemsTool(requestedLanguage);
    const suggestDateOptions = createSuggestDateOptionsTool(requestedLanguage);
    const selectRoomType = createSelectRoomTypeTool(requestedLanguage);

    const allTools = {
      planTripWithGuideItems,
      searchGuideItems,
      searchExperiences,
      getExperienceDetails,
      checkAvailability,
      getExperiencePromos,
      validatePromoCode,
      findSimilar,
      requestUserLocation,
      getLinkedExperiences,
      createBookingIntent,
      offerQuickReplies,
      suggestDateOptions,
      selectRoomType,
      getExperienceOptionDetails,
      getWeather,
      getCityInformation,
      getTopicInformation,
    };

    // Keep interactive quick replies available even if older config versions
    // have an outdated enabled_tools list.
    const enabledToolNames = new Set<AgentToolName>([
      ...agentConfig.enabledTools,
      "planTripWithGuideItems",
      "searchGuideItems",
      "offerQuickReplies",
      "suggestDateOptions",
      "selectRoomType",
      "getExperienceOptionDetails",
      "getWeather",
    ]);

    const enabledTools = Object.fromEntries(
      Object.entries(allTools).filter(([toolName]) =>
        enabledToolNames.has(toolName as AgentToolName),
      ),
    );

    const catalogTools =
      Object.keys(enabledTools).length > 0 ? enabledTools : allTools;
    // Web search is a core fallback rather than a configurable catalog tool:
    // older saved agent configs must still be able to answer when our own data
    // does not contain the factual travel information the user needs.
    const effectiveTools = {
      ...catalogTools,
      web_search: openai.tools.webSearch({
        externalWebAccess: true,
        searchContextSize: "medium",
      }),
    };

    aiDebug("chat.route", "runtime_config_loaded", {
      requestId,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxSteps: agentConfig.maxSteps,
      enabledTools: Object.keys(effectiveTools),
    });

    const configuredGreetingUnsureOption =
      process.env.AI_GREETING_INCLUDE_UNSURE_OPTION;
    const includeUnsureGreetingOption =
      typeof configuredGreetingUnsureOption === "string"
        ? isTruthyEnvVar(configuredGreetingUnsureOption)
        : true;
    const greetingOptions = getGreetingQuickReplyOptions(
      requestedLanguage,
      includeUnsureGreetingOption,
    );
    const destinationClarificationQuestion =
      getDestinationClarificationQuestion(requestedLanguage);
    const destinationClarificationOptions =
      getDestinationClarificationOptions(requestedLanguage);
    const requestedLanguageName = getLanguageDisplayName(requestedLanguage);
    const greetingTemplate = getGreetingWelcomeText(requestedLanguage);

    aiDebug("chat.route", "greeting_quick_replies_config", {
      requestId,
      requestedLanguage,
      includeUnsureGreetingOption,
      greetingOptions,
    });

    // Build system prompt with today's date for smart date resolution
    const todayDate = new Date().toISOString().split("T")[0];
    let systemPrompt =
      buildAgentPromptFromConfig({
        config: agentConfig,
        todayDate,
        enabledTools: Object.keys(effectiveTools),
        runtimeVariables: {
          REQUEST_LANGUAGE: requestedLanguage,
          REQUEST_LANGUAGE_NAME: requestedLanguageName,
          GREETING_WELCOME_TEXT: greetingTemplate,
          GREETING_QUICK_REPLIES: greetingOptions
            .map((option) => `- ${option}`)
            .join("\n"),
          DESTINATION_CLARIFICATION_QUESTION: destinationClarificationQuestion,
          DESTINATION_CLARIFICATION_OPTIONS: destinationClarificationOptions
            .map((option) => `- ${option}`)
            .join("\n"),
        },
      }) || buildSystemPrompt(todayDate, requestedLanguage);

    // Load catalog context so the AI knows what experiences are available
    const catalogContext = await loadCatalogContext(requestedLanguage);
    if (systemPrompt.includes("{{CATALOG_CONTEXT}}")) {
      systemPrompt = systemPrompt.replaceAll(
        "{{CATALOG_CONTEXT}}",
        catalogContext,
      );
    } else {
      systemPrompt += catalogContext;
    }

    const recentEntityContext = extractRecentEntityContext(safeMessages);
    if (recentEntityContext.promptBlock) {
      systemPrompt += recentEntityContext.promptBlock;
      aiDebug("chat.route", "recent_entity_context_injected", {
        requestId,
        roomHintsCount: recentEntityContext.roomHintsCount,
        experienceHintsCount: recentEntityContext.experienceHintsCount,
      });
    } else {
      aiDebug("chat.route", "recent_entity_context_empty", {
        requestId,
      });
    }

    if (isFirstVisibleUserTurn(safeMessages)) {
      systemPrompt += buildFirstUserTurnWelcomeContext(
        requestedLanguage,
        greetingTemplate,
      );
      aiDebug("chat.route", "first_user_turn_welcome_context_injected", {
        requestId,
        requestedLanguage,
      });
    }

    if (deepLinkRequest) {
      const deepLinkPromptBlock = await buildDeepLinkPromptBlock(
        deepLinkRequest,
        requestedLanguage,
      );

      if (deepLinkPromptBlock) {
        systemPrompt += deepLinkPromptBlock;
        aiDebug("chat.route", "deep_link_context_injected", {
          requestId,
          experienceId: deepLinkRequest.experienceId,
          experienceSlug: deepLinkRequest.experienceSlug,
        });
      } else {
        aiDebug("chat.route", "deep_link_context_missing", {
          requestId,
          experienceId: deepLinkRequest.experienceId,
        });
      }
    }

    // Inject user auth status so the AI never wrongly asks logged-in users to sign in
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      systemPrompt += `\n\n## USER AUTH STATUS\nThe user IS currently authenticated (logged in). Do NOT ask them to log in or create an account. If any previous tool result in the conversation shows requires_auth=true, that is outdated — the user is now logged in. Retry the booking action directly without asking them to log in again.`;
    } else {
      systemPrompt += `\n\n## USER AUTH STATUS\nThe user is NOT authenticated. If they attempt to book, tell them they need to log in or create an account first using the auth actions available in the UI.\nWhen they show clear interest in a specific stay or experience, you may gently encourage sign-in or registration with value-based phrasing such as "Create an account to save this stay and come back to it later" or "Sign in so you do not lose this accommodation."\nDo NOT ask the user to type their email address into the chat. Instead, direct them to the sign-in or registration flow.\nKeep this nudge light and natural. Use it when relevant, not in every message.`;
    }

    systemPrompt += `\n\n## LIVE WEATHER RULE\nFor current weather, temperature, rain, wind, or forecast questions, call getWeather before answering. Always translate the requested city or location to its English name for the getWeather location argument, even when the user writes in French, Arabic, or another language. Keep the final answer in the user's requested language. Use the returned current and forecast data, mention the exact date when the user uses relative dates, and do not answer live weather questions from general climate knowledge alone.`;

    systemPrompt += `\n\n## TRIP PLAN MEAL AND DUPLICATE RULES\nFor planTripWithGuideItems, include breakfast, lunch, and dinner by default. Set includeBreakfast, includeLunch, or includeDinner to false only when the user explicitly excludes that meal or asks for activity-only planning. Avoid same-day near-duplicate activities by name/topic, for example two items whose names both contain "bowling".`;

    systemPrompt += `\n\n## GUIDE ITEM PRESENTATION RULE\nWhenever searchGuideItems can return cards, set presentation.intro to one short localized overview of the result set without naming or describing individual items. If a useful follow-up is needed, set presentation.follow_up_question to exactly one localized question; the UI renders it after the final card. Do not write separate assistant prose, a numbered list, item names, or item descriptions when cards are returned. The guide-item UI already renders each item's description directly above its card. If no cards are returned, explain the empty or error result normally in assistant text.`;

    systemPrompt += `\n\n## GUIDE ITEM NAME LOOKUP RULE\nWhen the user asks whether you know, recognize, or have information about a specifically named local place, you MUST call searchGuideItems with searchMode="name" and query set to the place name before answering. Do not pass kinds in name mode, even if the name contains a word such as coffee, restaurant, spa, or museum. Treat matchStatus="found" as a confirmed catalog match. For "ambiguous", ask which returned city or location they mean. A "not_found" result means only that the place is absent from the Okeyo catalog: use web_search or reliable general knowledge to answer the user's actual question. Ask for the city, neighborhood, or spelling only when it is genuinely needed to identify the place. Never say that a named guide item is absent before this lookup. For generic café or coffee-shop discovery, use kinds=["coffee"], not restaurant.`;

    systemPrompt += `\n\n## EXTERNAL KNOWLEDGE FALLBACK\nOkeyo catalog data is the first source for Okeyo guide items, experiences, cards, bookable inventory, prices, amenities, promotions, and availability. However, an empty or incomplete searchGuideItems, searchExperiences, getCityInformation, or getTopicInformation result is not the end of the answer. When the user needs travel information that our tools did not return, answer the necessary question from reliable general knowledge; call web_search first whenever the fact may be current, local, specific, or uncertain (for example a named place, opening hours, transport details, entry rules, events, or recent conditions). Give the useful answer directly instead of leading with "we do not have this information" or asking for spelling/location merely because it is absent from Okeyo. Clearly distinguish external recommendations from bookable Okeyo inventory, and never create an Okeyo card or claim Okeyo availability, price, amenity, promotion, partnership, or booking support unless an Okeyo tool returned it. If reliable information still cannot be established after web search, state the narrow uncertainty and provide the most useful safe alternative.`;

    // Add user location context if available
    if (trustedUserLocation) {
      systemPrompt += `\n\n## Current User Location\nLatitude: ${trustedUserLocation.lat}\nLongitude: ${trustedUserLocation.lng}\n\nUse these coordinates for distance-based searches without asking for location again.`;
    }

    aiDebug("chat.route", "request_ready_for_model", {
      requestId,
      promptLength: systemPrompt.length,
      hasUserLocation: Boolean(trustedUserLocation),
    });

    const modelHistory = buildModelHistoryMessages(safeMessages);
    aiDebug("chat.route", "model_history_compacted", {
      requestId,
      inputMessagesCount: safeMessages.length,
      modelMessagesCount: modelHistory.compactedMessagesCount,
      droppedMessagesCount:
        modelHistory.originalMessagesCount -
        modelHistory.compactedMessagesCount,
      compactedCharLength: modelHistory.compactedCharLength,
    });

    const canSetTemperature = supportsTemperature(agentConfig.model);
    if (!canSetTemperature) {
      aiDebug("chat.route", "temperature_omitted_for_model", {
        requestId,
        model: agentConfig.model,
        configuredTemperature: agentConfig.temperature,
      });
    }

    const result = streamText({
      model: openai(agentConfig.model),
      system: systemPrompt,
      messages: await convertToModelMessages(
        modelHistory.messages as Parameters<typeof convertToModelMessages>[0],
      ),
      tools: effectiveTools,
      stopWhen: stepCountIs(agentConfig.maxSteps),
      ...(canSetTemperature ? { temperature: agentConfig.temperature } : {}),
      onFinish: async ({ usage, finishReason }) => {
        // Log usage for monitoring (optional)
        console.log("Chat completion finished:", {
          requestId,
          sessionId,
          configVersionId: agentConfig.versionId,
          model: agentConfig.model,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });
        aiDebug("chat.route", "completion_finished", {
          requestId,
          finishReason,
          totalTokens: usage?.totalTokens ?? null,
          promptTokens:
            (usage as (typeof usage & { promptTokens?: number }) | undefined)
              ?.promptTokens ?? null,
          completionTokens:
            (
              usage as
                | (typeof usage & { completionTokens?: number })
                | undefined
            )?.completionTokens ?? null,
        });

        const posthog = getPostHogClient();
        posthog?.capture({
          distinctId: currentUser?.id ?? sessionId ?? "anonymous",
          event: ANALYTICS_EVENT.AI_CHAT_COMPLETED,
          properties: {
            model: agentConfig.model,
            finish_reason: finishReason,
            total_tokens: usage?.totalTokens ?? null,
            session_id: typeof sessionId === "string" ? sessionId : null,
          },
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
