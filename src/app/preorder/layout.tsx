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
    title: t("seo.preorder.title"),
    description: t("seo.preorder.description"),
    alternates: buildLocaleAlternates("/preorder", locale),
    openGraph: {
      title: t("seo.preorder.title"),
      description: t("seo.preorder.description"),
      url: localizeHref("/preorder", locale),
    },
  };
}

export default function PreorderLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
