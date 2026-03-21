import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import FacebookPixel from "@/components/FacebookPixel";
import { FloatingChatButton } from "@/components/site/FloatingChatButton";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Okeyo Travel — Laissez parler votre mood",
    template: "%s",
  },
  description:
    "En 2 minutes, OKEYO vous recommande l'endroit le plus adapté à vos envies.",
  robots: process.env.NEXT_PUBLIC_NOINDEX === "true"
    ? { index: false, follow: false }
    : { index: true, follow: true },
  openGraph: {
    siteName: "Okeyo Travel",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@okeyotravel",
  },
  alternates: {
    languages: {
      fr: SITE_URL,
      "x-default": SITE_URL,
    },
  },
};

import type { ReactNode } from "react";
import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthProvider } from "@/providers/auth-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import QueryProvider from "@/providers/query-provider";
import { ViewModeProvider } from "@/providers/view-mode-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-locale");
  const locale = isSupportedLocale(headerLocale)
    ? headerLocale
    : DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <FacebookPixel />
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} antialiased min-h-[100dvh] flex flex-col bg-white`}
      >
        <PostHogProvider>
          <QueryProvider>
            <AuthProvider>
              <ViewModeProvider>
                <PostHogPageView />
                <main className="flex-1">{children}</main>
                <FloatingChatButton />
                <AuthModal />
              </ViewModeProvider>
            </AuthProvider>
          </QueryProvider>
        </PostHogProvider>
        <noscript>
          {/* biome-ignore lint/performance/noImgElement: Noscript fallback pixel must be a plain img tag. */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=4169949499921104&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
