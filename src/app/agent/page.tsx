import { ChatProvider } from '@/contexts/ChatContext';
import { BookingChat } from '@/components/chat/BookingChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assistant Voyage AI | Morocco Experiences',
  description: 'Votre assistant personnel pour découvrir et réserver des expériences au Maroc.',
};

export default function AgentPage() {
  return (
    <main className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <ChatProvider>
        <BookingChat />
      </ChatProvider>
    </main>
  );
}
