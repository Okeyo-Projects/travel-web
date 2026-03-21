import type { Metadata } from "next";
import { BookingChat } from "@/components/chat/BookingChat";
import { JsonLd } from "@/components/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const metadata: Metadata = {
  title: "Assistant voyage IA — Okeyo Travel",
  description:
    "Discutez avec notre assistant IA pour planifier votre voyage sur mesure en quelques minutes.",
  alternates: { canonical: "/chat" },
  openGraph: {
    title: "Assistant voyage IA — Okeyo Travel",
    description:
      "Discutez avec notre assistant IA pour planifier votre voyage sur mesure en quelques minutes.",
    url: "/chat",
  },
};

export default function ChatPage() {
  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Assistant voyage IA — Okeyo Travel",
          description:
            "Discutez avec notre assistant IA pour planifier votre voyage sur mesure en quelques minutes.",
          url: `${SITE_URL}/chat`,
          inLanguage: "fr",
        }}
      />
      <BookingChat />
    </>
  );
}
