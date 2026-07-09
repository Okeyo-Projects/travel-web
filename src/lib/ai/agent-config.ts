import { createClient } from "@/lib/supabase/server";

export type AgentToolName =
  | "planTripWithGuideItems"
  | "searchGuideItems"
  | "searchExperiences"
  | "getExperienceDetails"
  | "checkAvailability"
  | "getExperiencePromos"
  | "validatePromoCode"
  | "findSimilar"
  | "requestUserLocation"
  | "getLinkedExperiences"
  | "createBookingIntent"
  | "offerQuickReplies"
  | "suggestDateOptions"
  | "selectRoomType"
  | "getExperienceOptionDetails"
  | "getWeather"
  | "getCityInformation"
  | "getTopicInformation";

export const KNOWN_AGENT_TOOLS: AgentToolName[] = [
  "planTripWithGuideItems",
  "searchGuideItems",
  "searchExperiences",
  "getExperienceDetails",
  "checkAvailability",
  "getExperiencePromos",
  "validatePromoCode",
  "findSimilar",
  "requestUserLocation",
  "getLinkedExperiences",
  "createBookingIntent",
  "offerQuickReplies",
  "suggestDateOptions",
  "selectRoomType",
  "getExperienceOptionDetails",
  "getWeather",
  "getCityInformation",
  "getTopicInformation",
];

export type AgentWelcomeMessages = Record<
  string,
  {
    title: string;
    description: string;
  }
>;

export type AgentSuggestedPrompt = {
  title: string;
  prompt: string;
};

export type AgentSuggestedPrompts = Record<string, AgentSuggestedPrompt[]>;

export interface AgentRuntimeConfig {
  configId: string | null;
  versionId: string | null;
  model: string;
  temperature: number;
  maxSteps: number;
  enabledTools: AgentToolName[];
  systemPromptTemplate: string | null;
  systemPromptVariables: Record<string, unknown>;
  behaviorRules: Record<string, unknown>;
  guardrails: Record<string, unknown>;
  fallbackLanguage: string;
  supportedLanguages: string[];
  welcomeMessages: AgentWelcomeMessages;
  suggestedPrompts: AgentSuggestedPrompts;
}

const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_STEPS = 3;
const DEFAULT_FALLBACK_LANGUAGE = "fr";
const DEFAULT_SUPPORTED_LANGUAGES = ["fr", "en", "ar"];

const DEFAULT_WELCOME_MESSAGES: AgentWelcomeMessages = {
  fr: {
    title: "👋 Salam ! 🇲🇦✨",
    description:
      "Je suis Okeyo, ton compagnon de voyage au Maroc. Je peux recommander restaurants, activités, lieux à visiter, hidden gems, itinéraires et hébergements selon tes envies.",
  },
  en: {
    title: "👋 Salam! 🇲🇦✨",
    description:
      "I'm Okeyo, your travel companion in Morocco. I can recommend restaurants, activities, places to visit, hidden gems, itineraries, and stays based on what you want to experience.",
  },
  ar: {
    title: "👋 سلام! 🇲🇦✨",
    description:
      "أنا Okeyo، رفيق سفرك في المغرب. يمكنني اقتراح مطاعم وأنشطة وأماكن للزيارة وجواهر مخفية وبرامج سفر وإقامات حسب رغباتك.",
  },
};

const DEFAULT_SUGGESTED_PROMPTS: AgentSuggestedPrompts = {
  fr: [
    {
      title: "Essaouira",
      prompt: "Essaouira",
    },
    {
      title: "Marrakech",
      prompt: "Marrakech",
    },
    {
      title: "Chefchaouen",
      prompt: "Chefchaouen",
    },
    {
      title: "Imlil",
      prompt: "Imlil",
    },
    {
      title: "Lalla Takerkoust",
      prompt: "Lalla Takerkoust",
    },
  ],
  en: [
    {
      title: "Essaouira",
      prompt: "Essaouira",
    },
    {
      title: "Marrakech",
      prompt: "Marrakech",
    },
    {
      title: "Chefchaouen",
      prompt: "Chefchaouen",
    },
    {
      title: "Imlil",
      prompt: "Imlil",
    },
    {
      title: "Lalla Takerkoust",
      prompt: "Lalla Takerkoust",
    },
  ],
  ar: [
    {
      title: "الصويرة",
      prompt: "الصويرة",
    },
    {
      title: "مراكش",
      prompt: "مراكش",
    },
    {
      title: "شفشاون",
      prompt: "شفشاون",
    },
    {
      title: "إمليل",
      prompt: "إمليل",
    },
    {
      title: "للا تكركوست",
      prompt: "للا تكركوست",
    },
  ],
};

const CACHE_TTL_MS = 60_000;

type CachedConfig = {
  expiresAt: number;
  value: AgentRuntimeConfig;
};

const runtimeCache = new Map<string, CachedConfig>();

type SupabaseSingleResult = {
  data: Record<string, unknown> | null;
  error: unknown;
};

type SupabaseQueryBuilder = {
  select(columns: string): SupabaseQueryBuilder;
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  order(
    column: string,
    options?: {
      ascending?: boolean;
    },
  ): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  maybeSingle(): Promise<SupabaseSingleResult>;
};

type AgentConfigDatabaseClient = {
  from(
    table: "ai_agent_configs" | "ai_agent_config_versions",
  ): SupabaseQueryBuilder;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeStringArray(
  input: unknown,
  fallback: string[] = [],
): string[] {
  if (!Array.isArray(input)) return fallback;

  const output: string[] = [];
  const seen = new Set<string>();

  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }

  return output.length > 0 ? output : fallback;
}

function sanitizeToolArray(input: unknown): AgentToolName[] {
  if (!Array.isArray(input)) return KNOWN_AGENT_TOOLS;

  const allowed = new Set(KNOWN_AGENT_TOOLS);
  const selected = sanitizeStringArray(input).filter((tool) =>
    allowed.has(tool as AgentToolName),
  ) as AgentToolName[];

  return selected.length > 0 ? selected : KNOWN_AGENT_TOOLS;
}

function sanitizeWelcomeMessages(input: unknown): AgentWelcomeMessages {
  if (!isRecord(input)) return DEFAULT_WELCOME_MESSAGES;

  const merged: AgentWelcomeMessages = { ...DEFAULT_WELCOME_MESSAGES };
  for (const [language, value] of Object.entries(input)) {
    if (!isRecord(value)) continue;
    const title =
      typeof value.title === "string" && value.title.trim().length > 0
        ? value.title.trim()
        : merged[language]?.title || "";
    const description =
      typeof value.description === "string" &&
      value.description.trim().length > 0
        ? value.description.trim()
        : merged[language]?.description || "";

    if (!title || !description) continue;
    merged[language] = { title, description };
  }

  return merged;
}

function sanitizeSuggestedPrompts(input: unknown): AgentSuggestedPrompts {
  if (!isRecord(input)) return DEFAULT_SUGGESTED_PROMPTS;

  const output: AgentSuggestedPrompts = { ...DEFAULT_SUGGESTED_PROMPTS };
  for (const [language, value] of Object.entries(input)) {
    const prompts = sanitizeSuggestedPromptArray(value);
    if (prompts.length > 0) {
      output[language] = prompts;
    }
  }

  return output;
}

function sanitizeSuggestedPromptArray(input: unknown): AgentSuggestedPrompt[] {
  if (!Array.isArray(input)) return [];

  const output: AgentSuggestedPrompt[] = [];
  const seen = new Set<string>();

  for (const value of input) {
    if (!isRecord(value)) continue;

    const title = typeof value.title === "string" ? value.title.trim() : "";
    const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";
    if (!title || !prompt || seen.has(prompt)) continue;

    seen.add(prompt);
    output.push({ title, prompt });
  }

  return output;
}

function sanitizeRecord(input: unknown): Record<string, unknown> {
  return isRecord(input) ? input : {};
}

function sanitizeNumber(
  value: unknown,
  fallback: number,
  opts?: { min?: number; max?: number; integer?: boolean },
): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) return fallback;

  let next = numeric;
  if (opts?.integer) next = Math.trunc(next);
  if (typeof opts?.min === "number") next = Math.max(opts.min, next);
  if (typeof opts?.max === "number") next = Math.min(opts.max, next);
  return next;
}

function buildDefaultRuntimeConfig(): AgentRuntimeConfig {
  return {
    configId: null,
    versionId: null,
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    maxSteps: DEFAULT_MAX_STEPS,
    enabledTools: KNOWN_AGENT_TOOLS,
    systemPromptTemplate: null,
    systemPromptVariables: {},
    behaviorRules: {},
    guardrails: {},
    fallbackLanguage: DEFAULT_FALLBACK_LANGUAGE,
    supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES,
    welcomeMessages: DEFAULT_WELCOME_MESSAGES,
    suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
  };
}

function cacheKey(slug: string, versionId?: string | null): string {
  return `${slug}:${versionId || "active"}`;
}

export async function loadAgentRuntimeConfig({
  slug = "booking-agent",
  overrideVersionId,
}: {
  slug?: string;
  overrideVersionId?: string | null;
} = {}): Promise<AgentRuntimeConfig> {
  const key = cacheKey(slug, overrideVersionId);
  const now = Date.now();
  const cached = runtimeCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const fallback = buildDefaultRuntimeConfig();

  try {
    const supabase = await createClient();
    const db = supabase as unknown as AgentConfigDatabaseClient;

    const { data: configRow, error: configError } = await db
      .from("ai_agent_configs")
      .select("id, slug, active_version_id")
      .eq("slug", slug)
      .maybeSingle();

    if (configError || !configRow?.id) {
      runtimeCache.set(key, {
        expiresAt: now + CACHE_TTL_MS,
        value: fallback,
      });
      return fallback;
    }

    let targetVersionId: string | null = null;
    if (overrideVersionId) {
      targetVersionId = overrideVersionId;
    } else if (typeof configRow.active_version_id === "string") {
      targetVersionId = configRow.active_version_id;
    }

    let versionRow: Record<string, unknown> | null = null;

    if (targetVersionId) {
      const { data: row, error: versionError } = await db
        .from("ai_agent_config_versions")
        .select("*")
        .eq("id", targetVersionId)
        .maybeSingle();

      if (!versionError && row) {
        versionRow = row;
      }
    }

    if (!versionRow) {
      const { data: row, error: publishedError } = await db
        .from("ai_agent_config_versions")
        .select("*")
        .eq("config_id", configRow.id)
        .eq("status", "published")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!publishedError && row) {
        versionRow = row;
      }
    }

    if (!versionRow) {
      const value = {
        ...fallback,
        configId: configRow.id as string,
      };
      runtimeCache.set(key, {
        expiresAt: now + CACHE_TTL_MS,
        value,
      });
      return value;
    }

    const runtimeConfig: AgentRuntimeConfig = {
      configId: configRow.id as string,
      versionId: typeof versionRow.id === "string" ? versionRow.id : null,
      model:
        typeof versionRow.model === "string" &&
        versionRow.model.trim().length > 0
          ? versionRow.model
          : fallback.model,
      temperature: sanitizeNumber(
        versionRow.temperature,
        fallback.temperature,
        {
          min: 0,
          max: 2,
        },
      ),
      maxSteps: sanitizeNumber(versionRow.max_steps, fallback.maxSteps, {
        min: 1,
        max: 8,
        integer: true,
      }),
      enabledTools: sanitizeToolArray(versionRow.enabled_tools),
      systemPromptTemplate:
        typeof versionRow.system_prompt === "string" &&
        versionRow.system_prompt.trim().length > 0
          ? versionRow.system_prompt
          : null,
      systemPromptVariables: sanitizeRecord(versionRow.system_prompt_variables),
      behaviorRules: sanitizeRecord(versionRow.behavior_rules),
      guardrails: sanitizeRecord(versionRow.guardrails),
      fallbackLanguage:
        typeof versionRow.fallback_language === "string" &&
        versionRow.fallback_language.trim().length > 0
          ? versionRow.fallback_language.trim()
          : fallback.fallbackLanguage,
      supportedLanguages: sanitizeStringArray(
        versionRow.supported_languages,
        fallback.supportedLanguages,
      ),
      welcomeMessages: sanitizeWelcomeMessages(versionRow.welcome_messages),
      suggestedPrompts: sanitizeSuggestedPrompts(versionRow.suggested_prompts),
    };

    runtimeCache.set(key, {
      expiresAt: now + CACHE_TTL_MS,
      value: runtimeConfig,
    });
    return runtimeConfig;
  } catch (error) {
    console.error("Failed to load agent runtime config:", error);
    runtimeCache.set(key, {
      expiresAt: now + CACHE_TTL_MS,
      value: fallback,
    });
    return fallback;
  }
}

export function clearAgentRuntimeConfigCache(): void {
  runtimeCache.clear();
}
