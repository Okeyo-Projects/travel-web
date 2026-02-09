import type { AgentRuntimeConfig } from "@/lib/ai/agent-config";

interface BuildAgentPromptInput {
  config: AgentRuntimeConfig;
  todayDate: string;
  enabledTools: string[];
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function formatBehaviorRules(rules: Record<string, unknown>): string {
  const entries = Object.entries(rules).filter(([, value]) => value !== null);
  if (entries.length === 0) return "No additional behavior overrides.";

  return entries
    .map(([key, value]) => `- ${key}: ${stringifyValue(value)}`)
    .join("\n");
}

function formatGuardrails(rules: Record<string, unknown>): string {
  const entries = Object.entries(rules).filter(([, value]) => value !== null);
  if (entries.length === 0) return "No additional guardrails.";

  return entries
    .map(([key, value]) => `- ${key}: ${stringifyValue(value)}`)
    .join("\n");
}

function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const normalized = String(key);
    if (Object.prototype.hasOwnProperty.call(variables, normalized)) {
      return variables[normalized];
    }

    const lower = normalized.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(variables, lower)) {
      return variables[lower];
    }

    const upper = normalized.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(variables, upper)) {
      return variables[upper];
    }

    return match;
  });
}

export function buildAgentPromptFromConfig({
  config,
  todayDate,
  enabledTools,
}: BuildAgentPromptInput): string | null {
  const template = config.systemPromptTemplate;
  if (!template || !template.trim()) return null;

  const runtimeVariables: Record<string, string> = {
    TODAY_DATE: todayDate,
    AVAILABLE_TOOLS: enabledTools.map((tool) => `- ${tool}`).join("\n"),
    BEHAVIOR_RULES: formatBehaviorRules(config.behaviorRules),
    GUARDRAILS: formatGuardrails(config.guardrails),
    FALLBACK_LANGUAGE: config.fallbackLanguage,
    SUPPORTED_LANGUAGES: config.supportedLanguages.join(", "),
  };

  for (const [key, value] of Object.entries(config.systemPromptVariables)) {
    runtimeVariables[key] = stringifyValue(value);
  }

  return replaceTemplateVariables(template, runtimeVariables);
}
