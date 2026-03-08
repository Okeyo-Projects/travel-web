import { type AppLocale, DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";

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
