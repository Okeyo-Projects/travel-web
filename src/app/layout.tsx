import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter";
import { AuthModal } from "@/components/auth/auth-modal";
import FacebookPixel from "@/components/FacebookPixel";
import { JsonLd } from "@/components/seo/json-ld";
import { FloatingChatButton } from "@/components/site/FloatingChatButton";
import {
  createTranslator,
  getLocaleDirection,
  getLocaleMessages,
  LOCALE_OPEN_GRAPH,
  resolveLocale,
} from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { AuthProvider } from "@/providers/auth-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import QueryProvider from "@/providers/query-provider";
import { TranslationsProvider } from "@/providers/translations-provider";
import { ViewModeProvider } from "@/providers/view-mode-provider";
import "./globals.css";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";
const FAVICON_BASE_PATH = "/favicon";

async function getRequestLocale() {
  const requestHeaders = await headers();
  return resolveLocale(requestHeaders.get("x-locale"));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("seo.layout.title"),
      template: "%s",
    },
    description: t("seo.layout.description"),
    manifest: `${FAVICON_BASE_PATH}/site.webmanifest`,
    icons: {
      icon: [
        { url: `${FAVICON_BASE_PATH}/favicon.ico` },
        {
          url: `${FAVICON_BASE_PATH}/favicon-32x32.png`,
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: `${FAVICON_BASE_PATH}/favicon-16x16.png`,
          sizes: "16x16",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: `${FAVICON_BASE_PATH}/apple-touch-icon.png`,
          sizes: "180x180",
          type: "image/png",
        },
      ],
      shortcut: [`${FAVICON_BASE_PATH}/favicon.ico`],
    },
    robots:
      process.env.NEXT_PUBLIC_NOINDEX === "true"
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      siteName: t("app.name"),
      locale: LOCALE_OPEN_GRAPH[locale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@okeyotravel",
    },
    alternates: buildLocaleAlternates("/", locale),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const messages = getLocaleMessages(locale);
  const direction = getLocaleDirection(locale);
  const t = createTranslator(messages);
  const ogLocale = LOCALE_OPEN_GRAPH[locale];
  const alternateOgLocales = Object.values(LOCALE_OPEN_GRAPH).filter(
    (value) => value !== ogLocale,
  );

  return (
    <html lang={locale} dir={direction}>
      <FacebookPixel nonce={nonce} />
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link
          rel="preconnect"
          href={
            process.env.NEXT_PUBLIC_SUPABASE_URL ??
            "https://nfqamqrxgpyuhjhedllg.supabase.co"
          }
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href={
            process.env.NEXT_PUBLIC_SUPABASE_URL ??
            "https://nfqamqrxgpyuhjhedllg.supabase.co"
          }
        />
        <meta property="og:locale" content={ogLocale} />
        {alternateOgLocales.map((value) => (
          <meta key={value} property="og:locale:alternate" content={value} />
        ))}
        <JsonLd
          schema={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: t("app.name"),
              url: SITE_URL,
              logo: `${SITE_URL}/logo_white.png`,
              description: t("seo.layout.organizationDescription"),
              sameAs: ["https://www.instagram.com/okeyotravel"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                availableLanguage: locale,
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: t("app.name"),
              url: `${SITE_URL}${localizeHref("/", locale)}`,
              inLanguage: locale,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}${localizeHref(
                    "/explore?q={search_term_string}",
                    locale,
                  )}`,
                },
                "query-input": "required name=search_term_string",
              },
            },
          ]}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} antialiased min-h-[100dvh] flex flex-col bg-white`}
      >
        <NextTopLoader color="#FF6B35" showSpinner={false} />
        <TranslationsProvider locale={locale} messages={messages}>
          <PostHogProvider>
            <QueryProvider>
              <AuthProvider>
                <ViewModeProvider>
                  <PostHogPageView />
                  <WebVitalsReporter />
                  <main className="flex-1">{children}</main>
                  <FloatingChatButton />
                  <AuthModal />
                </ViewModeProvider>
              </AuthProvider>
            </QueryProvider>
          </PostHogProvider>
        </TranslationsProvider>
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
