export const LOCALES = ["fr", "en", "ar"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";

export function isSupportedLocale(
  value: string | null | undefined,
): value is AppLocale {
  if (!value) {
    return false;
  }
  return LOCALES.includes(value as AppLocale);
}
