import { tool } from "ai";
import { z } from "zod";

const offerQuickRepliesSchema = z.object({
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
  allow_free_text: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether users can still answer with free text after selecting from options",
    ),
});

const LODGING_FALLBACK_OPTIONS = [
  "Riad romantique",
  "Calme & nature",
  "Piscine / Spa",
  "Petit budget",
  "Je ne sais pas",
];

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

function sanitizeQuestion(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    return "Quel type d'hébergement vous intéresse ?";
  }

  if (NON_LODGING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "Quel type d'hébergement vous intéresse ?";
  }

  return normalized;
}

function sanitizeOptions(input: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of input) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!isLodgingOnlyOption(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= 6) break;
  }

  if (output.length < 2) {
    return LODGING_FALLBACK_OPTIONS;
  }

  return output;
}

export const offerQuickReplies = tool({
  description: `Present clickable quick-reply options to the user for faster interaction.
Use this when you need the user to choose one option (city, dates preference, budget level, confirmation, etc.)
instead of typing a full response. Keep options short and actionable.`,
  inputSchema: offerQuickRepliesSchema,
  execute: async ({ question, options, allow_free_text }) => {
    const normalizedQuestion = sanitizeQuestion(question);
    const normalizedOptions = sanitizeOptions(options);

    return {
      success: true,
      type: "quick_replies",
      question: normalizedQuestion,
      options: normalizedOptions,
      allow_free_text: allow_free_text ?? true,
    };
  },
});
