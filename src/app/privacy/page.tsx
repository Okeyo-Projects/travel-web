import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getLegalLastUpdated,
  getPrivacySections,
} from "@/components/legal/legal-data";
import { LegalPage } from "@/components/legal/legal-page";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return {
    title: t("seo.privacy.title"),
    description: t("seo.privacy.description"),
    alternates: buildLocaleAlternates("/privacy", locale),
    openGraph: {
      title: t("seo.privacy.title"),
      description: t("seo.privacy.description"),
      url: localizeHref("/privacy", locale),
    },
  };
}

export default async function PrivacyPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return (
    <LegalPage
      title={t("legal.privacy.title")}
      description={t("legal.privacy.description")}
      lastUpdated={getLegalLastUpdated(locale)}
      sections={getPrivacySections(locale)}
      eyebrow={t("legal.page.eyebrow")}
      lastUpdatedLabel={t("legal.page.lastUpdated")}
      homeHref={localizeHref("/", locale)}
      homeLabel={t("legal.page.home")}
      exploreHref={localizeHref("/explore", locale)}
      exploreLabel={t("legal.page.explore")}
      tableOfContentsLabel={t("legal.page.tableOfContents")}
      onThisPageLabel={t("legal.page.onThisPage")}
      sectionLabel={t("legal.page.section")}
    />
  );
}
