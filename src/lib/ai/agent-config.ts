import { createClient } from "@/lib/supabase/server";

export type AgentToolName =
  | "searchExperiences"
  | "getExperienceDetails"
  | "checkAvailability"
  | "getExperiencePromos"
  | "validatePromoCode"
  | "findSimilar"
  | "requestUserLocation"
  | "getLinkedExperiences"
  | "createBookingIntent";

export const KNOWN_AGENT_TOOLS: AgentToolName[] = [
  "searchExperiences",
  "getExperienceDetails",
  "checkAvailability",
  "getExperiencePromos",
  "validatePromoCode",
  "findSimilar",
  "requestUserLocation",
  "getLinkedExperiences",
  "createBookingIntent",
];

export type AgentWelcomeMessages = Record<
  string,
  {
    title: string;
    description: string;
  }
>;

export type AgentSuggestedPrompts = Record<string, string[]>;

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
    title: "Bonjour, je suis votre Assistant Voyage",
    description:
      "Je peux vous aider à planifier votre séjour au Maroc, trouver des hébergements uniques et réserver des expériences inoubliables.",
  },
  en: {
    title: "Hi, I am your Travel Assistant",
    description:
      "I can help you plan your trip in Morocco, find unique stays, and book unforgettable experiences.",
  },
  ar: {
    title: "مرحبا، أنا مساعد السفر الخاص بك",
    description:
      "يمكنني مساعدتك في تخطيط رحلتك في المغرب والعثور على إقامات مميزة وحجز تجارب لا تنسى.",
  },
};

const DEFAULT_SUGGESTED_PROMPTS: AgentSuggestedPrompts = {
  fr: [
    "Je cherche un riad romantique à Marrakech pour ce weekend.",
    "Propose-moi une randonnée de 2 jours dans l'Atlas.",
    "Quelles sont les meilleures activités culturelles à Fès ?",
    "Montre-moi les offres de dernière minute pour Agadir.",
  ],
  en: [
    "I am looking for a romantic riad in Marrakech this weekend.",
    "Suggest a 2-day hike in the Atlas.",
    "What are the best cultural activities in Fes?",
    "Show me last-minute offers for Agadir.",
  ],
  ar: [
    "أبحث عن رياض رومانسي في مراكش نهاية هذا الأسبوع.",
    "اقترح علي رحلة مشي لمدة يومين في الأطلس.",
    "ما أفضل الأنشطة الثقافية في فاس؟",
    "اعرض لي عروض اللحظة الأخيرة في أكادير.",
  ],
};

const CACHE_TTL_MS = 60_000;

type CachedConfig = {
  expiresAt: number;
  value: AgentRuntimeConfig;
};

const runtimeCache = new Map<string, CachedConfig>();

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
      typeof value.description === "string" && value.description.trim().length > 0
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
    const prompts = sanitizeStringArray(value);
    if (prompts.length > 0) {
      output[language] = prompts;
    }
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
    const db = supabase as any;

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
        typeof versionRow.model === "string" && versionRow.model.trim().length > 0
          ? versionRow.model
          : fallback.model,
      temperature: sanitizeNumber(versionRow.temperature, fallback.temperature, {
        min: 0,
        max: 2,
      }),
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
