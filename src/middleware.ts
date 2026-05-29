import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";
import {
  EXPERIENCE_ROUTE_ALIASES,
  localizeStaticPath,
  normalizeLocalizedStaticPath,
} from "@/lib/routing/locale-path";

const PUBLIC_FILE = /\.[^/]+$/;
const POSTHOG_PROXY_PATH = "/internal/collect";

// C9: Legacy typo redirects (expand as data fixes are confirmed)
const LEGACY_REDIRECTS: Record<string, string> = {
  // Example: "/fr/hebergement/marrakech-safi/marrekch": "/fr/hebergement/marrakech-safi/marrakech",
};

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith(POSTHOG_PROXY_PATH) ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  );
}

function buildCsp(_nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://*.googleapis.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://connect.facebook.net https://www.google-analytics.com https://*.googleapis.com https://www.googletagmanager.com https:",
    "media-src 'self' blob: https:",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16)),
  ).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const getCacheHeaders = () => {
    const isApiRoute =
      pathname.startsWith("/api") || pathname.startsWith(POSTHOG_PROXY_PATH);

    if (isApiRoute) {
      return {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      };
    }

    return {
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "CDN-Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    };
  };

  if (shouldBypass(pathname)) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";

  // C9: Legacy typo redirects
  const legacyTarget = LEGACY_REDIRECTS[pathname];
  if (legacyTarget) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyTarget;
    const response = NextResponse.redirect(redirectUrl, 301);
    response.headers.set("Content-Security-Policy", csp);
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // C7: Redirect /en/hebergement/ → /en/accommodation/ (permanent)
  if (firstSegment === "en" && pathname.startsWith("/en/hebergement/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace(
      "/en/hebergement/",
      "/en/accommodation/",
    );
    const response = NextResponse.redirect(redirectUrl, 308);
    response.headers.set("Content-Security-Policy", csp);
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  if (isSupportedLocale(firstSegment)) {
    const localePath =
      pathname.replace(new RegExp(`^/${firstSegment}`), "") || "/";
    const canonicalLocalizedPath = localizeStaticPath(localePath, firstSegment);

    if (canonicalLocalizedPath !== localePath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${firstSegment}${canonicalLocalizedPath}`;
      const response = NextResponse.redirect(redirectUrl, 308);
      response.headers.set("Content-Security-Policy", csp);
      Object.entries(getCacheHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    let rewrittenPath = normalizeLocalizedStaticPath(localePath);

    // Normalize locale-translated experience segment aliases → /hebergement/
    for (const alias of EXPERIENCE_ROUTE_ALIASES) {
      if (alias !== "hebergement" && rewrittenPath.startsWith(`/${alias}/`)) {
        rewrittenPath = `/hebergement${rewrittenPath.slice(alias.length + 1)}`;
        break;
      }
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewrittenPath;
    requestHeaders.set("x-locale", firstSegment);

    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  if (request.headers.get("x-locale")) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  const defaultLocalePath =
    pathname === "/"
      ? "/"
      : localizeStaticPath(
          normalizeLocalizedStaticPath(pathname),
          DEFAULT_LOCALE,
        );
  redirectUrl.pathname =
    defaultLocalePath === "/"
      ? `/${DEFAULT_LOCALE}`
      : `/${DEFAULT_LOCALE}${defaultLocalePath}`;

  const response = NextResponse.redirect(redirectUrl, 308);
  response.headers.set("Content-Security-Policy", csp);
  Object.entries(getCacheHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
