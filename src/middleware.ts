import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";

const PUBLIC_FILE = /\.[^/]+$/;

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  );
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://connect.facebook.net",
    "media-src 'self' blob: https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const csp = buildCsp(nonce);

  if (shouldBypass(pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";

  if (isSupportedLocale(firstSegment)) {
    const rewrittenPath =
      pathname.replace(new RegExp(`^/${firstSegment}`), "") || "/";
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewrittenPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", firstSegment);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname =
    pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
