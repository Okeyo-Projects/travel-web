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

function sanitizeOptions(input: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of input) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= 6) break;
  }

  if (output.length < 2) {
    return ["Oui", "Non"];
  }

  return output;
}

export const offerQuickReplies = tool({
  description: `Present clickable quick-reply options to the user for faster interaction.
Use this when you need the user to choose one option (city, dates preference, budget level, confirmation, etc.)
instead of typing a full response. Keep options short and actionable.`,
  inputSchema: offerQuickRepliesSchema,
  execute: async ({ question, options, allow_free_text }) => {
    const normalizedQuestion = question.trim();
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
