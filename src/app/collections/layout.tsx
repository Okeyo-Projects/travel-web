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
    title: t("seo.collections.title"),
    description: t("seo.collections.description"),
    alternates: buildLocaleAlternates("/collections", locale),
    openGraph: {
      title: t("seo.collections.title"),
      description: t("seo.collections.description"),
      url: localizeHref("/collections", locale),
    },
  };
}

export default async function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("seo.collections.title"),
          description: t("seo.collections.description"),
          url: `${SITE_URL}${localizeHref("/collections", locale)}`,
          inLanguage: locale,
        }}
      />
      {children}
    </>
  );
}
