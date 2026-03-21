import arMessages from "@/locales/ar.json";
import enMessages from "@/locales/en.json";
import frMessages from "@/locales/fr.json";

export const LOCALES = ["fr", "en", "ar"] as const;

export type AppLocale = (typeof LOCALES)[number];

export type LocaleDirection = "ltr" | "rtl";
export type IntlLocale = "fr-FR" | "en-US" | "ar-MA";

export type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>;

export type MessageTree = {
  [key: string]: string | MessageTree;
};

export const DEFAULT_LOCALE: AppLocale = "fr";

export const LOCALE_DIRECTIONS: Record<AppLocale, LocaleDirection> = {
  fr: "ltr",
  en: "ltr",
  ar: "rtl",
};

export const LOCALE_OPEN_GRAPH: Record<AppLocale, string> = {
  fr: "fr_FR",
  en: "en_US",
  ar: "ar_MA",
};

export const LOCALE_INTL: Record<AppLocale, IntlLocale> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};

export const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export const LOCALE_MESSAGES = {
  fr: frMessages,
  en: enMessages,
  ar: arMessages,
} as const satisfies Record<AppLocale, MessageTree>;

export type Translator = (key: string, values?: TranslationValues) => string;

export function isSupportedLocale(
  value: string | null | undefined,
): value is AppLocale {
  if (!value) {
    return false;
  }
  return LOCALES.includes(value as AppLocale);
}

export function resolveLocale(
  value: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  return isSupportedLocale(value) ? value : fallback;
}

export function resolveMessageValue(
  tree: MessageTree,
  key: string,
): string | MessageTree | null {
  const resolved = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return null;
    }

    if (Array.isArray(current)) {
      return null;
    }

    return (current as Record<string, unknown>)[segment] ?? null;
  }, tree);

  if (typeof resolved === "string") {
    return resolved;
  }

  if (resolved && typeof resolved === "object" && !Array.isArray(resolved)) {
    return resolved as MessageTree;
  }

  return null;
}

function resolveMessage(tree: MessageTree, key: string): string | null {
  const resolved = resolveMessageValue(tree, key);
  return typeof resolved === "string" ? resolved : null;
}

function interpolateMessage(
  message: string,
  values?: TranslationValues,
): string {
  if (!values) {
    return message;
  }

  return message.replace(/\{([^}]+)\}/g, (match, token) => {
    const value = values[token];
    return value === null || value === undefined ? match : String(value);
  });
}

export function getLocaleDirection(
  locale: AppLocale = DEFAULT_LOCALE,
): LocaleDirection {
  return LOCALE_DIRECTIONS[locale];
}

export function getIntlLocale(locale: AppLocale = DEFAULT_LOCALE): IntlLocale {
  return LOCALE_INTL[locale];
}

export function getLocaleMessages(
  locale: AppLocale = DEFAULT_LOCALE,
): MessageTree {
  return LOCALE_MESSAGES[locale];
}

export function createTranslator(
  localeOrMessages: AppLocale | MessageTree = DEFAULT_LOCALE,
): Translator {
  const messages =
    typeof localeOrMessages === "string"
      ? getLocaleMessages(localeOrMessages)
      : localeOrMessages;

  return (key, values) => {
    const message = resolveMessage(messages, key);
    if (!message) {
      return key;
    }

    return interpolateMessage(message, values);
  };
}
