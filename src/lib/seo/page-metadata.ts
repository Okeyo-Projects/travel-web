import type { AppLocale } from "@/lib/i18n";

type LocalizedText =
  | string
  | Partial<Record<AppLocale, string | null>>
  | null
  | undefined;

const SITE_NAME = "Okeyo Travel";
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "au",
  "aux",
  "avec",
  "by",
  "dans",
  "de",
  "des",
  "du",
  "en",
  "et",
  "for",
  "in",
  "la",
  "le",
  "les",
  "of",
  "on",
  "or",
  "par",
  "pour",
  "sur",
  "the",
  "to",
  "un",
  "une",
  "و",
  "في",
  "من",
  "على",
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toTitleCase(text: string): string {
  if (!text) return text;

  const upper = text.toUpperCase();
  const lower = text.toLowerCase();

  if (upper === text) {
    return text
      .toLowerCase()
      .replace(
        /(^|\s)([a-zàâäéèêëïîôùûüçÿ])/g,
        (_, separator, char) => separator + char.toUpperCase(),
      )
      .replace(/\b(d'|l'|de|la|le|les|des|du|aux|à|au)\b/gi, (match) =>
        match.toLowerCase(),
      )
      .replace(
        /\b(Marrakech|Meknès|Fès|Oujda|Rabat|Casablanca|Agadir|Tanger|Tétouan|Essaouira|Chefchaouen)\b/g,
        (match) => {
          const known: Record<string, string> = {
            marrakech: "Marrakech",
            meknès: "Meknès",
            fès: "Fès",
            oujda: "Oujda",
            rabat: "Rabat",
            casablanca: "Casablanca",
            agadir: "Agadir",
            tanger: "Tanger",
            tétouan: "Tétouan",
            essaouira: "Essaouira",
            chefchaouen: "Chefchaouen",
          };
          return known[match.toLowerCase()] || match;
        },
      );
  }

  return text;
}

export function buildPageTitle(title: string): string {
  const titleCased = toTitleCase(title);
  return `${normalizeText(titleCased)} — ${SITE_NAME}`;
}

export function resolveLocalizedText(
  value: LocalizedText,
  locale: AppLocale,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = normalizeText(value);
    return normalized || null;
  }

  const resolved = value[locale] ?? value.fr ?? value.en ?? value.ar ?? null;

  if (typeof resolved !== "string") {
    return null;
  }

  const normalized = normalizeText(resolved);
  return normalized || null;
}

export function buildKeywords(
  ...values: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  const pushKeyword = (value: string) => {
    const normalized = normalizeText(value);
    const key = normalized.toLocaleLowerCase();

    if (!normalized || normalized.length < 2 || seen.has(key)) {
      return;
    }

    seen.add(key);
    keywords.push(normalized);
  };

  for (const value of values) {
    if (!value) {
      continue;
    }

    pushKeyword(value);

    const phrases = value
      .split(/[.!?؛،,\n:()|/]+/g)
      .map((part) => normalizeText(part))
      .filter((part) => part.length >= 3);

    for (const phrase of phrases) {
      pushKeyword(phrase);
    }

    const words = value
      .split(/[^\p{L}\p{N}]+/u)
      .map((word) => normalizeText(word))
      .filter(
        (word) => word.length >= 3 && !STOP_WORDS.has(word.toLocaleLowerCase()),
      );

    for (const word of words) {
      pushKeyword(word);
    }
  }

  return keywords.slice(0, 15);
}
