"use client";

import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useEffect, useRef } from "react";
import { parseMessageContent } from "@/lib/chat/parse-message";
import { ExperienceCardsGrid } from "./ExperienceCardsGrid";
import { LocationRequest } from "./LocationRequest";

type Message = UIMessage & { content?: string };
type ExperienceResult = Record<string, unknown> & { id?: string };
type UIData = Record<string, unknown>;

type ParsedBlock =
  | { key: string; type: "text"; content: string }
  | { key: string; type: "ui"; content: { component: string; data: UIData } };

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

type TextPart = { type: "text"; text: string };
type ToolPart = { type?: string; state?: string; output?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTextPart(part: unknown): part is TextPart {
  return (
    isRecord(part) && part.type === "text" && typeof part.text === "string"
  );
}

function extractSearchResults(output: unknown): ExperienceResult[] | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (!Array.isArray(output.results)) return null;
  return output.results.filter(isRecord) as ExperienceResult[];
}

function extractLocationReason(output: unknown): string {
  if (!isRecord(output)) return "pour trouver des expériences près de vous";

  const reason = output.reason ?? output.message;
  if (typeof reason === "string" && reason.trim()) {
    return reason;
  }

  return "pour trouver des expériences près de vous";
}

function isExperienceCardsData(
  data: unknown,
): data is { experiences: ExperienceResult[] } {
  return (
    isRecord(data) &&
    Array.isArray(data.experiences) &&
    data.experiences.every((item) => isRecord(item))
  );
}

function isLocationRequestData(data: unknown): data is { reason: string } {
  return isRecord(data) && typeof data.reason === "string";
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground animate-pulse">
            Je réfléchis à votre demande...
          </div>
        </div>
      )}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

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
        {parsedContent.map((block) => {
          if (block.type === "text") {
            return (
              <div
                key={block.key}
                className="prose prose-neutral dark:prose-invert max-w-none"
              >
                <p className="whitespace-pre-wrap leading-relaxed text-base">
                  {block.content}
                </p>
              </div>
            );
          }

          return (
            <div key={block.key} className="my-4">
              <UIBlock
                component={block.content.component}
                data={block.content.data}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function extractUserMessageText(message: Message): string {
  const textFromParts = (message.parts || [])
    .filter(isTextPart)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (textFromParts) return textFromParts;
  return typeof message.content === "string" ? message.content.trim() : "";
}

function extractAssistantBlocks(message: Message): ParsedBlock[] {
  const parts = (message.parts || []) as unknown[];
  const blocks: ParsedBlock[] = [];
  const seenSignatures = new Set<string>();

  const pushUniqueBlock = (block: ParsedBlock, signature: string) => {
    if (seenSignatures.has(signature)) return;
    seenSignatures.add(signature);
    blocks.push(block);
  };

  for (const rawPart of parts) {
    if (isTextPart(rawPart)) {
      const text = rawPart.text.trim();
      if (text) {
        pushUniqueBlock(
          { key: `text:${text}`, type: "text", content: text },
          `text:${text}`,
        );
      }
      continue;
    }

    if (!isRecord(rawPart)) continue;
    const part = rawPart as ToolPart;

    if (
      part.type === "tool-requestUserLocation" &&
      part.state === "output-available"
    ) {
      const reason = extractLocationReason(part.output);
      pushUniqueBlock(
        {
          key: `location_request:${reason}`,
          type: "ui",
          content: {
            component: "location_request",
            data: { reason },
          },
        },
        `location_request:${reason}`,
      );
      continue;
    }

    if (
      part.type === "tool-searchExperiences" &&
      part.state === "output-available"
    ) {
      const experiences = extractSearchResults(part.output);
      if (!experiences || experiences.length === 0) continue;

      const ids = experiences
        .map((exp) => (typeof exp.id === "string" ? exp.id : ""))
        .filter(Boolean);

      const signature =
        ids.length > 0
          ? `experience_cards:${ids.join(",")}`
          : "experience_cards:empty";

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "experience_cards",
            data: { experiences },
          },
        },
        signature,
      );
    }
  }

  if (blocks.length > 0) {
    return blocks;
  }

  if (typeof message.content === "string" && message.content.trim()) {
    const parsed = parseMessageContent(message.content);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((block) => {
        if (!isRecord(block) || typeof block.type !== "string") return null;

        if (block.type === "text" && typeof block.content === "string") {
          const content = block.content.trim();
          if (!content) return null;
          return {
            key: `text:${content}`,
            type: "text" as const,
            content,
          };
        }

        if (
          block.type === "ui" &&
          isRecord(block.content) &&
          typeof block.content.component === "string" &&
          isRecord(block.content.data)
        ) {
          const component = block.content.component;
          const data = block.content.data;
          return {
            key: `${component}:${JSON.stringify(data)}`,
            type: "ui" as const,
            content: { component, data },
          };
        }

        return null;
      })
      .filter((block): block is ParsedBlock => block !== null);
  }

  return [];
}

function UIBlock({ component, data }: { component: string; data: unknown }) {
  switch (component) {
    case "experience_cards":
      if (!isExperienceCardsData(data)) return null;
      return <ExperienceCardsGrid experiences={data.experiences} />;

    case "location_request":
      if (!isLocationRequestData(data)) return null;
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
