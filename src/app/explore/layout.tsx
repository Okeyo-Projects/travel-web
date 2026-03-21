import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

async function getRequestTranslator() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  return {
    locale,
    t: createTranslator(locale),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getRequestTranslator();

  return {
    title: t("seo.explore.title"),
    description: t("seo.explore.description"),
    alternates: buildLocaleAlternates("/explore", locale),
    openGraph: {
      title: t("seo.explore.title"),
      description: t("seo.explore.description"),
      url: localizeHref("/explore", locale),
    },
  };
}

export default async function ExploreLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { locale, t } = await getRequestTranslator();

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("seo.explore.title"),
          description: t("seo.explore.description"),
          url: `${SITE_URL}${localizeHref("/explore", locale)}`,
          inLanguage: locale,
        }}
      />
      {children}
    </>
  );
}
