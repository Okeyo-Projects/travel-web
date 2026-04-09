import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return {
    title: t("seo.category.title"),
    description: t("seo.category.description"),
    alternates: buildLocaleAlternates("/explore/region", locale),
    openGraph: {
      title: t("seo.category.title"),
      description: t("seo.category.description"),
      url: localizeHref("/explore/region", locale),
    },
  };
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
