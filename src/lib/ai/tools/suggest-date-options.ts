import { tool } from "ai";
import { z } from "zod";

const suggestDateOptionsSchema = z.object({
  nights: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(2)
    .describe("Number of nights/days for each suggested option"),
  start_after: z
    .string()
    .optional()
    .describe("Optional minimum start date (YYYY-MM-DD)"),
  include_flexible: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include a 'flexible dates' option"),
  max_options: z
    .number()
    .int()
    .min(2)
    .max(6)
    .optional()
    .default(4)
    .describe("Maximum number of suggested options"),
  language: z
    .enum(["fr", "en", "ar"])
    .optional()
    .default("fr")
    .describe("Language for labels"),
});

type SupportedLanguage = "fr" | "en" | "ar";
type SuggestedDateOption = {
  id: string;
  label: string;
  reply_text: string;
  from_date?: string;
  to_date?: string;
  nights?: number;
};

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfUtcDay(input: Date): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
}

function addDays(input: Date, days: number): Date {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toISODate(input: Date): string {
  return input.toISOString().split("T")[0];
}

function ensureNotBefore(candidate: Date, minDate: Date): Date {
  let next = candidate;
  while (next < minDate) {
    next = addDays(next, 7);
  }
  return next;
}

function nextSaturday(from: Date): Date {
  const day = from.getUTCDay();
  const delta = (6 - day + 7) % 7 || 7;
  return addDays(from, delta);
}

function nextMonday(from: Date): Date {
  const day = from.getUTCDay();
  const delta = (8 - day) % 7 || 7;
  return addDays(from, delta);
}

function getQuestion(language: SupportedLanguage): string {
  if (language === "en") return "Choose your preferred dates:";
  if (language === "ar") return "اختر التواريخ المناسبة لك:";
  return "Choisissez les dates qui vous conviennent :";
}

function buildDateLabel(
  language: SupportedLanguage,
  key: "weekend" | "next_week" | "in_two_weeks",
  fromDate: string,
  toDate: string,
): string {
  if (language === "en") {
    if (key === "weekend") return `Next weekend (${fromDate} -> ${toDate})`;
    if (key === "next_week") return `Next week (${fromDate} -> ${toDate})`;
    return `In two weeks (${fromDate} -> ${toDate})`;
  }

  if (language === "ar") {
    if (key === "weekend")
      return `نهاية الأسبوع القادمة (${fromDate} -> ${toDate})`;
    if (key === "next_week") return `الأسبوع القادم (${fromDate} -> ${toDate})`;
    return `بعد أسبوعين (${fromDate} -> ${toDate})`;
  }

  if (key === "weekend") return `Ce weekend (${fromDate} -> ${toDate})`;
  if (key === "next_week")
    return `Semaine prochaine (${fromDate} -> ${toDate})`;
  return `Dans 2 semaines (${fromDate} -> ${toDate})`;
}

function buildReplyText(
  language: SupportedLanguage,
  label: string,
  fromDate: string,
  toDate: string,
): string {
  if (language === "en") {
    return `I choose "${label}": from ${fromDate} to ${toDate}.`;
  }
  if (language === "ar") {
    return `أختار "${label}": من ${fromDate} إلى ${toDate}.`;
  }
  return `Je choisis "${label}" : du ${fromDate} au ${toDate}.`;
}

function buildFlexibleOption(language: SupportedLanguage): SuggestedDateOption {
  if (language === "en") {
    return {
      id: "flexible",
      label: "My dates are flexible",
      reply_text: "My dates are flexible.",
    };
  }
  if (language === "ar") {
    return {
      id: "flexible",
      label: "تواريخي مرنة",
      reply_text: "تواريخي مرنة.",
    };
  }
  return {
    id: "flexible",
    label: "Dates flexibles",
    reply_text: "Mes dates sont flexibles.",
  };
}

export const suggestDateOptions = tool({
  description: `Suggest clickable date options to speed up date selection.
Use this when the user has not provided exact dates and you want to offer 2-4 concrete alternatives.`,
  inputSchema: suggestDateOptionsSchema,
  execute: async ({
    nights,
    start_after,
    include_flexible,
    max_options,
    language,
  }) => {
    const normalizedNights = Math.max(1, nights || 2);
    const today = startOfUtcDay(new Date());
    const minStart = parseDate(start_after) || today;
    const safeMinStart = minStart > today ? minStart : today;

    const weekendStart = ensureNotBefore(nextSaturday(today), safeMinStart);
    const nextWeekStart = ensureNotBefore(nextMonday(today), safeMinStart);
    const twoWeeksStart = ensureNotBefore(
      addDays(nextWeekStart, 7),
      safeMinStart,
    );

    const templates = [
      { id: "next_weekend", key: "weekend" as const, start: weekendStart },
      { id: "next_week", key: "next_week" as const, start: nextWeekStart },
      {
        id: "in_two_weeks",
        key: "in_two_weeks" as const,
        start: twoWeeksStart,
      },
    ];

    const options: SuggestedDateOption[] = templates.map((item) => {
      const fromDate = toISODate(item.start);
      const toDate = toISODate(addDays(item.start, normalizedNights));
      const label = buildDateLabel(language, item.key, fromDate, toDate);
      const replyText = buildReplyText(language, label, fromDate, toDate);

      return {
        id: item.id,
        label,
        from_date: fromDate,
        to_date: toDate,
        nights: normalizedNights,
        reply_text: replyText,
      };
    });

    if (include_flexible) {
      options.push(buildFlexibleOption(language));
    }

    const limitedOptions = options.slice(0, max_options);

    return {
      success: true,
      type: "date_options",
      question: getQuestion(language),
      options: limitedOptions,
      allow_free_text: true,
    };
  },
});
