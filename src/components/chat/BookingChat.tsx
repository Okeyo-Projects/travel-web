'use client';

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useChatContext } from '@/contexts/ChatContext';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { ChatWelcome } from './ChatWelcome';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function BookingChat() {
  const { userLocation, setUserLocation, sessionId } = useChatContext();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
      }),
    []
  );

  const { messages, status, sendMessage } = useChat({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const buildRequestBody = () => ({
    sessionId,
    userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
  });

  const sendUserMessage = async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText || isLoading) return;

    await sendMessage(
      { text: normalizedText },
      {
        body: buildRequestBody(),
      }
    );
    setInput('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendUserMessage(input);
  };

  const handleSuggestionClick = async (prompt: string) => {
    await sendUserMessage(prompt);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col"
            >
              <ChatWelcome onSelectSuggestion={handleSuggestionClick} />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-full flex flex-col"
            >
              <MessageList messages={messages} isLoading={isLoading} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4">
        <ChatInput 
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          onRequestLocation={handleRequestLocation}
        />
      </div>
    </div>
  );
}
