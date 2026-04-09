import type { Metadata } from "next";
import { headers } from "next/headers";
import { BookingChat } from "@/components/chat/BookingChat";
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
    title: t("seo.chat.title"),
    description: t("seo.chat.description"),
    robots: { index: false, follow: false },
    alternates: buildLocaleAlternates("/chat", locale),
    openGraph: {
      title: t("seo.chat.title"),
      description: t("seo.chat.description"),
      url: localizeHref("/chat", locale),
    },
  };
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale, t } = await getRequestTranslator();
  const { q } = await searchParams;

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("seo.chat.title"),
          description: t("seo.chat.description"),
          url: `${SITE_URL}${localizeHref("/chat", locale)}`,
          inLanguage: locale,
        }}
      />
      <BookingChat initialMessage={q} />
    </>
  );
}
