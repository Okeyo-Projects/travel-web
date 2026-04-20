import { tool } from "ai";
import { z } from "zod";
import {
  getGreetingQuickReplyOptions,
  getQuickReplyFallbackQuestion,
  localizeKnownQuickReplyOption,
  localizeKnownQuickReplyQuestion,
  type SupportedLanguage,
} from "@/lib/ai/chat-language";

function createOfferQuickRepliesSchema(defaultLanguage: SupportedLanguage) {
  return z.object({
    question: z
      .string()
      .min(2)
      .max(300)
      .describe("Short question shown above the quick reply buttons"),
    options: z
      .array(z.string().min(1).max(120))
      .min(2)
      .max(8)
      .describe(
        "Reply options the user can tap (2 to 8 options, concise and mutually exclusive when possible)",
      ),
    language: z
      .enum(["fr", "en", "ar"])
      .optional()
      .default(defaultLanguage)
      .describe("Language for the quick-reply question and fallback labels"),
    allow_free_text: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Whether users can still answer with free text after selecting from options",
      ),
  });
}

const NON_LODGING_PATTERNS: RegExp[] = [
  /\btrip\b/i,
  /\btrips\b/i,
  /\bactivity\b/i,
  /\bactivities\b/i,
  /activité/i,
  /activités/i,
  /trek/i,
  /randonn[éee]/i,
  /excursion/i,
  /atelier/i,
  /session/i,
  /departure/i,
  /voyage/i,
  /aventure/i,
];

function isLodgingOnlyOption(value: string): boolean {
  return !NON_LODGING_PATTERNS.some((pattern) => pattern.test(value));
}

const MAX_QUESTION_LENGTH = 120;

function isNarrativeQuestion(value: string): boolean {
  if (value.length > MAX_QUESTION_LENGTH) return true;
  const sentenceCount = (value.match(/[.!?](\s|$)/g) ?? []).length;
  if (sentenceCount >= 2) return true;
  return false;
}

function sanitizeQuestion(input: string, language: SupportedLanguage): string {
  const normalized = input.trim();
  if (!normalized) {
    return getQuickReplyFallbackQuestion(language);
  }

  if (NON_LODGING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return getQuickReplyFallbackQuestion(language);
  }

  if (isNarrativeQuestion(normalized)) {
    return getQuickReplyFallbackQuestion(language);
  }

  return localizeKnownQuickReplyQuestion(normalized, language);
}

function sanitizeOptions(
  input: string[],
  language: SupportedLanguage,
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of input) {
    const trimmed = localizeKnownQuickReplyOption(value.trim(), language);
    if (!trimmed) continue;
    if (!isLodgingOnlyOption(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= 6) break;
  }

  if (output.length < 2) {
    return getGreetingQuickReplyOptions(language);
  }

  return output;
}

export function createOfferQuickRepliesTool(
  defaultLanguage: SupportedLanguage = "fr",
) {
  return tool({
    description: `Present clickable quick-reply options to the user for faster interaction.
Use this when you need the user to choose one option (city, dates preference, budget level, confirmation, etc.)
instead of typing a full response. Keep the question and labels in the user's current language.`,
    inputSchema: createOfferQuickRepliesSchema(defaultLanguage),
    execute: async ({ question, options, language, allow_free_text }) => {
      const normalizedQuestion = sanitizeQuestion(question, language);
      const normalizedOptions = sanitizeOptions(options, language);

      return {
        success: true,
        type: "quick_replies",
        question: normalizedQuestion,
        options: normalizedOptions,
        allow_free_text: allow_free_text ?? true,
      };
    },
  });
}

export const offerQuickReplies = createOfferQuickRepliesTool();
