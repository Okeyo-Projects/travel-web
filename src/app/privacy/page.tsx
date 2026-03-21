import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  LEGAL_LAST_UPDATED,
  privacySections,
} from "@/components/legal/legal-data";
import { LegalPage } from "@/components/legal/legal-page";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

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

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Cette page détaille les données collectées par okeyo travel, leur usage, les cas de partage, vos droits et les mesures de sécurité mises en place."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={privacySections}
    />
  );
}
