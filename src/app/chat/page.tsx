import { ChatProvider } from '@/contexts/ChatContext';
import { BookingChat } from '@/components/chat/BookingChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat AI | Morocco Experiences',
  description: 'Discutez avec notre assistant pour planifier votre voyage.',
};

export default function ChatPage() {
  return (
    <main className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <ChatProvider>
        <BookingChat />
      </ChatProvider>
    </main>
  );
}
