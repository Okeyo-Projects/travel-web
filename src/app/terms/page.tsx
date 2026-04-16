import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  LEGAL_LAST_UPDATED,
  termsSections,
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
    title: t("seo.terms.title"),
    description: t("seo.terms.description"),
    alternates: buildLocaleAlternates("/terms", locale),
    openGraph: {
      title: t("seo.terms.title"),
      description: t("seo.terms.description"),
      url: localizeHref("/terms", locale),
    },
  };
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      description="Ces conditions encadrent l'utilisation d'okeyo travel, la publication des offres, les réservations, les paiements et les responsabilités des utilisateurs comme des prestataires."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={termsSections}
    />
  );
}
