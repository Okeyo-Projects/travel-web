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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";

  if (isSupportedLocale(firstSegment)) {
    const rewrittenPath =
      pathname.replace(new RegExp(`^/${firstSegment}`), "") || "/";
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewrittenPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", firstSegment);

    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname =
    pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/:path*"],
};
