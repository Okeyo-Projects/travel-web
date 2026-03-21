import type { Metadata } from "next";
import { headers } from "next/headers";
import { BookingChat } from "@/components/chat/BookingChat";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const href = `/chat/${id}`;

  return {
    title: t("seo.chatConversation.title"),
    description: t("seo.chatConversation.description"),
    alternates: buildLocaleAlternates(href, locale),
    openGraph: {
      title: t("seo.chatConversation.title"),
      description: t("seo.chatConversation.description"),
      url: localizeHref(href, locale),
    },
  };
}

interface ConversationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;
  return <BookingChat initialConversationId={id} />;
}
