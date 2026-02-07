'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { parseMessageContent } from '@/lib/chat/parse-message';
import { ExperienceCardsGrid } from './ExperienceCardsGrid';
import { LocationRequest } from './LocationRequest';
import { Compass } from 'lucide-react';
import { motion } from 'framer-motion';

type Message = UIMessage & { content?: string };
type ParsedBlock =
  | { type: 'text'; content: string }
  | { type: 'ui'; content: { component: string; data: any } };

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      {messages.map((message, index) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex items-start gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-48"></div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  if (isUser) {
    const text = extractUserMessageText(message);
    if (!text) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-primary/5 text-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-5 py-3 text-base">
          <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      </motion.div>
    );
  }

  const parsedContent = extractAssistantBlocks(message);
  if (parsedContent.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4"
    >
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Compass className="w-4 h-4 text-primary-foreground" />
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        {parsedContent.map((block, index) => {
          if (block.type === 'text') {
            return (
              <div key={index} className="prose prose-neutral dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-base">{block.content}</p>
              </div>
            );
          }

          if (block.type === 'ui') {
            return (
              <div key={index} className="my-4">
                <UIBlock component={block.content.component} data={block.content.data} />
              </div>
            );
          }

          return null;
        })}
      </div>
    </motion.div>
  );
}

function extractUserMessageText(message: Message): string {
  const textFromParts = (message.parts || [])
    .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('\n')
    .trim();

  if (textFromParts) return textFromParts;
  return typeof message.content === 'string' ? message.content.trim() : '';
}

function extractAssistantBlocks(message: Message): ParsedBlock[] {
  const parts = message.parts || [];
  const blocks: ParsedBlock[] = [];

  for (const part of parts as any[]) {
    if (part?.type === 'text' && typeof part?.text === 'string') {
      const text = part.text.trim();
      if (text) blocks.push({ type: 'text', content: text });
      continue;
    }

    if (
      part?.type === 'tool-requestUserLocation' &&
      part?.state === 'output-available' &&
      part?.output
    ) {
      blocks.push({
        type: 'ui',
        content: {
          component: 'location_request',
          data: {
            reason: part.output.reason || part.output.message || 'pour trouver des expériences près de vous',
          },
        },
      });
      continue;
    }

    if (
      part?.type === 'tool-searchExperiences' &&
      part?.state === 'output-available' &&
      part?.output?.success &&
      Array.isArray(part.output.results)
    ) {
      blocks.push({
        type: 'ui',
        content: {
          component: 'experience_cards',
          data: { experiences: part.output.results },
        },
      });
    }
  }

  if (blocks.length > 0) {
    return blocks;
  }

  if (typeof message.content === 'string' && message.content.trim()) {
    return parseMessageContent(message.content) as ParsedBlock[];
  }

  return [];
}

function UIBlock({ component, data }: { component: string; data: any }) {
  switch (component) {
    case 'experience_cards':
      return <ExperienceCardsGrid experiences={data.experiences} />;
    
    case 'location_request':
      return <LocationRequest reason={data.reason} />;
    
    default:
      return (
        <div className="border rounded-lg p-4 bg-muted/50 font-mono text-xs">
          <p className="font-semibold mb-2">Debug UI Component: {component}</p>
          <pre className="overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}
