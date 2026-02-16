import type { Metadata } from "next";
import { BookingChat } from "@/components/chat/BookingChat";

export const metadata: Metadata = {
  title: "Conversation | Chat AI",
  description: "Continuez votre conversation avec notre assistant.",
};

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
