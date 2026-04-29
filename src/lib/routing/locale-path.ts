import {
  type AppLocale,
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALES,
} from "@/lib/i18n";

// Maps the internal /hebergement/ segment to its locale-specific public-facing equivalent.
// Arabic keeps the French word; only English gets a translated segment.
export const EXPERIENCE_ROUTE_SEGMENT: Record<AppLocale, string> = {
  fr: "hebergement",
  ar: "hebergement",
  en: "accommodation",
};

// All surface forms that map to the internal /hebergement/ route.
export const EXPERIENCE_ROUTE_ALIASES = Object.values(EXPERIENCE_ROUTE_SEGMENT);

export function localizeExperiencePath(
  internalPath: string,
  locale: AppLocale,
): string {
  const segment = EXPERIENCE_ROUTE_SEGMENT[locale];
  return internalPath.replace(/^\/hebergement\//, `/${segment}/`);
}

function splitHref(href: string) {
  const queryIndex = href.indexOf("?");
  const hashIndex = href.indexOf("#");

  const indexes = [queryIndex, hashIndex].filter((value) => value >= 0);
  const cutAt = indexes.length ? Math.min(...indexes) : -1;

  if (cutAt < 0) {
    return { pathname: href, suffix: "" };
  }

  return {
    pathname: href.slice(0, cutAt),
    suffix: href.slice(cutAt),
  };
}

export function getLocaleFromPathname(
  pathname: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  if (!pathname) {
    return fallback;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return isSupportedLocale(firstSegment) ? firstSegment : fallback;
}

export function stripLocalePrefix(pathname: string | null | undefined): string {
  if (!pathname) {
    return "/";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }

  if (!isSupportedLocale(segments[0])) {
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }

  const stripped = `/${segments.slice(1).join("/")}`;
  return stripped === "/" ? "/" : stripped.replace(/\/+$/, "");
}

export function localizeHref(
  href: string,
  localeOrPathname?: AppLocale | string | null,
  fallback: AppLocale = DEFAULT_LOCALE,
): string {
  if (!href) {
    return `/${fallback}`;
  }

  if (/^https?:\/\//.test(href)) {
    return href;
  }

  const locale = isSupportedLocale(localeOrPathname)
    ? localeOrPathname
    : getLocaleFromPathname(localeOrPathname, fallback);

  const { pathname, suffix } = splitHref(href);
  const normalizedPathname = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  const withoutLocale = stripLocalePrefix(normalizedPathname);

  if (withoutLocale === "/") {
    return `/${locale}${suffix}`;
  }

  return `/${locale}${withoutLocale}${suffix}`;
}

/**
 * Builds canonical and hreflang URLs for one route.
 *
 * Most callers should pass the currently rendered locale as the second argument
 * so canonical stays self-referential. Omit it only for routes that intentionally
 * canonicalize to the default French page.
 */
export function buildLocaleAlternates(
  href: string,
  canonicalLocale: AppLocale = DEFAULT_LOCALE,
) {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, localizeHref(href, locale)]),
  ) as Record<AppLocale, string>;

  return {
    canonical: localizeHref(href, canonicalLocale),
    languages: {
      ...languages,
      "x-default": localizeHref(href, DEFAULT_LOCALE),
    },
  };
}

// Like buildLocaleAlternates but translates the /hebergement/ segment per locale.
export function buildExperienceAlternates(
  internalPath: string,
  canonicalLocale: AppLocale = DEFAULT_LOCALE,
) {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      localizeHref(localizeExperiencePath(internalPath, locale), locale),
    ]),
  ) as Record<AppLocale, string>;

  return {
    canonical: localizeHref(
      localizeExperiencePath(internalPath, canonicalLocale),
      canonicalLocale,
    ),
    languages: {
      ...languages,
      "x-default": localizeHref(
        localizeExperiencePath(internalPath, DEFAULT_LOCALE),
        DEFAULT_LOCALE,
      ),
    },
  };
}
