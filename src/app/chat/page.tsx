import type { Metadata } from "next";
import { BookingChat } from "@/components/chat/BookingChat";

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
  return <BookingChat />;
}
