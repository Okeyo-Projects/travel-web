"use client";

import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { parseMessageContent } from "@/lib/chat/parse-message";
import { AuthRequiredCard } from "./AuthRequiredCard";
import { DateOptionsPicker, type DateOptionItem } from "./DateOptionsPicker";
import {
  ExperienceDetailsPanel,
  type ExperienceDetailsData,
} from "./ExperienceDetailsPanel";
import {
  ExperienceOptionDetailsPanel,
  type ExperienceOptionDetailsData,
} from "./ExperienceOptionDetailsPanel";
import {
  ExperienceCardsGrid,
  type ExperienceGridItem,
} from "./ExperienceCardsGrid";
import { LocationRequest } from "./LocationRequest";
import { QuickReplies } from "./QuickReplies";
import { RoomTypeSelector, type RoomTypeOptionItem } from "./RoomTypeSelector";

type Message = UIMessage & { content?: string };
type ExperienceResult = Record<string, unknown>;
type UIData = unknown;

type ParsedBlock =
  | { key: string; type: "text"; content: string }
  | { key: string; type: "ui"; content: { component: string; data: UIData } };

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onQuickReply?: (reply: string) => void;
}

type TextPart = { type: "text"; text: string };
type ToolPart = { type?: string; state?: string; output?: unknown };

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return <strong key={`strong-${index}`}>{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={`code-${index}`}
          className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`text-${index}`}>{token}</Fragment>;
  });
}

function renderAssistantText(text: string): ReactNode {
  const normalized = text.replaceAll("\r\n", "\n").trim();
  if (!normalized) return null;

  const renderedBlocks: ReactNode[] = [];
  const lines = normalized.split("\n");
  let index = 0;
  let blockIndex = 0;

  const isBulletLine = (line: string) => /^\s*[-*•]\s+/.test(line);
  const isOrderedLine = (line: string) => /^\s*\d+\.\s+/.test(line);
  const isHeadingLine = (line: string) => /^\s*#{1,3}\s+/.test(line);

  while (index < lines.length) {
    const current = lines[index].trim();

    if (!current) {
      index += 1;
      continue;
    }

    if (/^###\s+/.test(current)) {
      renderedBlocks.push(
        <h3 key={`h3-${blockIndex}`} className="text-base font-semibold">
          {renderInlineMarkdown(current.replace(/^###\s+/, ""))}
        </h3>,
      );
      blockIndex += 1;
      index += 1;
      continue;
    }

    if (/^##\s+/.test(current)) {
      renderedBlocks.push(
        <h2 key={`h2-${blockIndex}`} className="text-lg font-semibold">
          {renderInlineMarkdown(current.replace(/^##\s+/, ""))}
        </h2>,
      );
      blockIndex += 1;
      index += 1;
      continue;
    }

    if (/^#\s+/.test(current)) {
      renderedBlocks.push(
        <h1 key={`h1-${blockIndex}`} className="text-xl font-semibold">
          {renderInlineMarkdown(current.replace(/^#\s+/, ""))}
        </h1>,
      );
      blockIndex += 1;
      index += 1;
      continue;
    }

    if (isBulletLine(current)) {
      const items: string[] = [];
      while (index < lines.length && isBulletLine(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\s*[-*•]\s+/, ""));
        index += 1;
      }

      renderedBlocks.push(
        <ul key={`ul-${blockIndex}`} className="list-disc space-y-1 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`li-${blockIndex}-${itemIndex}`}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      blockIndex += 1;
      continue;
    }

    if (isOrderedLine(current)) {
      const items: string[] = [];
      while (index < lines.length && isOrderedLine(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }

      renderedBlocks.push(
        <ol key={`ol-${blockIndex}`} className="list-decimal space-y-1 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`oli-${blockIndex}-${itemIndex}`}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>,
      );
      blockIndex += 1;
      continue;
    }

    const paragraphLines: string[] = [current];
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next) break;
      if (isHeadingLine(next) || isBulletLine(next) || isOrderedLine(next)) break;
      paragraphLines.push(next);
      index += 1;
    }

    renderedBlocks.push(
      <p key={`p-${blockIndex}`} className="leading-relaxed text-base">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>,
    );
    blockIndex += 1;
  }

  return <div className="space-y-3">{renderedBlocks}</div>;
}

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
  return output.results.filter(isRecord);
}

function extractLocationReason(output: unknown): string {
  if (!isRecord(output)) return "pour trouver des expériences près de vous";

  const reason = output.reason ?? output.message;
  if (typeof reason === "string" && reason.trim()) {
    return reason;
  }

  return "pour trouver des expériences près de vous";
}

function extractAuthRequiredReason(output: unknown): string | null {
  if (!isRecord(output) || output.requires_auth !== true) return null;

  if (typeof output.error === "string" && output.error.trim()) {
    return output.error;
  }

  return "Vous devez être connecté pour réserver.";
}

function extractQuickReplies(output: unknown): {
  question: string;
  options: string[];
  allow_free_text: boolean;
} | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (typeof output.question !== "string" || !output.question.trim()) {
    return null;
  }
  if (!Array.isArray(output.options)) return null;

  const options = output.options
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 6);

  if (options.length < 2) return null;

  return {
    question: output.question.trim(),
    options,
    allow_free_text:
      typeof output.allow_free_text === "boolean"
        ? output.allow_free_text
        : true,
  };
}

function extractDateOptions(output: unknown): {
  question: string;
  options: DateOptionItem[];
  allow_free_text: boolean;
} | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (typeof output.question !== "string" || !output.question.trim()) {
    return null;
  }
  if (!Array.isArray(output.options)) return null;

  const options = output.options
    .filter(isRecord)
    .map((option) => {
      const label = typeof option.label === "string" ? option.label.trim() : "";
      const replyText =
        typeof option.reply_text === "string" ? option.reply_text.trim() : "";
      const id = typeof option.id === "string" ? option.id : label;

      if (!label || !replyText || !id) return null;

      return {
        id,
        label,
        reply_text: replyText,
        from_date:
          typeof option.from_date === "string" ? option.from_date : undefined,
        to_date:
          typeof option.to_date === "string" ? option.to_date : undefined,
        nights: typeof option.nights === "number" ? option.nights : undefined,
      };
    })
    .filter((option) => option !== null)
    .slice(0, 6) as DateOptionItem[];

  if (options.length === 0) return null;

  return {
    question: output.question.trim(),
    options,
    allow_free_text:
      typeof output.allow_free_text === "boolean"
        ? output.allow_free_text
        : true,
  };
}

function extractRoomTypeSelector(output: unknown): {
  question: string;
  experience_title?: string;
  rooms: RoomTypeOptionItem[];
  allow_free_text: boolean;
} | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (typeof output.question !== "string" || !output.question.trim()) {
    return null;
  }
  if (!Array.isArray(output.rooms)) return null;

  const rooms = output.rooms
    .filter(isRecord)
    .map((room) => {
      const roomTypeId =
        typeof room.room_type_id === "string" ? room.room_type_id : "";
      const name = typeof room.name === "string" ? room.name.trim() : "";
      const replyText =
        typeof room.reply_text === "string" ? room.reply_text.trim() : "";
      if (!roomTypeId || !name || !replyText) return null;

      return {
        room_type_id: roomTypeId,
        name,
        room_type:
          typeof room.room_type === "string" ? room.room_type : undefined,
        description:
          typeof room.description === "string" ? room.description : undefined,
        price_mad: typeof room.price_mad === "number" ? room.price_mad : null,
        max_persons:
          typeof room.max_persons === "number" ? room.max_persons : null,
        capacity_beds:
          typeof room.capacity_beds === "number" ? room.capacity_beds : null,
        equipments: Array.isArray(room.equipments)
          ? room.equipments
              .filter((value): value is string => typeof value === "string")
              .slice(0, 5)
          : [],
        reply_text: replyText,
      };
    })
    .filter((room) => room !== null)
    .slice(0, 8) as RoomTypeOptionItem[];

  if (rooms.length === 0) return null;

  const experienceTitle = isRecord(output.experience)
    ? typeof output.experience.title === "string"
      ? output.experience.title
      : undefined
    : undefined;

  return {
    question: output.question.trim(),
    experience_title: experienceTitle,
    rooms,
    allow_free_text:
      typeof output.allow_free_text === "boolean"
        ? output.allow_free_text
        : true,
  };
}

function extractExperienceDetails(
  output: unknown,
): ExperienceDetailsData | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (!isRecord(output.experience)) return null;

  const experience = output.experience;
  if (
    typeof experience.id !== "string" ||
    typeof experience.title !== "string"
  ) {
    return null;
  }

  return output as unknown as ExperienceDetailsData;
}

function extractOptionDetails(
  output: unknown,
): ExperienceOptionDetailsData | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (output.type !== "option_details") return null;
  if (!isRecord(output.experience)) return null;
  if (typeof output.experience.id !== "string") return null;
  if (typeof output.experience.title !== "string") return null;
  if (!Array.isArray(output.options)) return null;

  return {
    option_type:
      typeof output.option_type === "string" ? output.option_type : "room",
    experience: {
      id: output.experience.id,
      title: output.experience.title,
      type:
        typeof output.experience.type === "string"
          ? output.experience.type
          : undefined,
      city:
        typeof output.experience.city === "string"
          ? output.experience.city
          : null,
      region:
        typeof output.experience.region === "string"
          ? output.experience.region
          : null,
    },
    options: output.options.filter(isRecord),
    query: typeof output.query === "string" ? output.query : null,
    message: typeof output.message === "string" ? output.message : null,
  };
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

function isAuthRequiredData(data: unknown): data is { reason: string } {
  return isRecord(data) && typeof data.reason === "string";
}

function isQuickRepliesData(data: unknown): data is {
  question: string;
  options: string[];
  allow_free_text: boolean;
} {
  return (
    isRecord(data) &&
    typeof data.question === "string" &&
    Array.isArray(data.options) &&
    data.options.every((option) => typeof option === "string") &&
    typeof data.allow_free_text === "boolean"
  );
}

function isDateOptionsData(data: unknown): data is {
  question: string;
  options: DateOptionItem[];
  allow_free_text: boolean;
} {
  return (
    isRecord(data) &&
    typeof data.question === "string" &&
    Array.isArray(data.options) &&
    typeof data.allow_free_text === "boolean"
  );
}

function isRoomTypeSelectorData(data: unknown): data is {
  question: string;
  experience_title?: string;
  rooms: RoomTypeOptionItem[];
  allow_free_text: boolean;
} {
  return (
    isRecord(data) &&
    typeof data.question === "string" &&
    Array.isArray(data.rooms) &&
    typeof data.allow_free_text === "boolean"
  );
}

function isExperienceDetailsData(data: unknown): data is ExperienceDetailsData {
  if (!isRecord(data)) return false;
  if (!isRecord(data.experience)) return false;
  if (typeof data.experience.id !== "string") return false;
  if (typeof data.experience.title !== "string") return false;
  return true;
}

function isExperienceOptionDetailsData(
  data: unknown,
): data is ExperienceOptionDetailsData {
  if (!isRecord(data)) return false;
  if (!isRecord(data.experience)) return false;
  if (typeof data.experience.id !== "string") return false;
  if (typeof data.experience.title !== "string") return false;
  if (!Array.isArray(data.options)) return false;
  if (typeof data.option_type !== "string") return false;
  return true;
}

export function MessageList({
  messages,
  isLoading,
  onQuickReply,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onQuickReply={onQuickReply}
        />
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

function MessageItem({
  message,
  onQuickReply,
}: {
  message: Message;
  onQuickReply?: (reply: string) => void;
}) {
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
                {renderAssistantText(block.content)}
              </div>
            );
          }

          return (
            <div key={block.key} className="my-4">
              <UIBlock
                component={block.content.component}
                data={block.content.data}
                onQuickReply={onQuickReply}
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

    if (
      part.type === "tool-createBookingIntent" &&
      part.state === "output-available"
    ) {
      const reason = extractAuthRequiredReason(part.output);
      if (!reason) continue;

      pushUniqueBlock(
        {
          key: `auth_required:${reason}`,
          type: "ui",
          content: {
            component: "auth_required",
            data: { reason },
          },
        },
        `auth_required:${reason}`,
      );
    }

    if (
      part.type === "tool-offerQuickReplies" &&
      part.state === "output-available"
    ) {
      const quickReplies = extractQuickReplies(part.output);
      if (!quickReplies) continue;

      const signature = `quick_replies:${quickReplies.question}:${quickReplies.options.join("|")}`;
      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "quick_replies",
            data: quickReplies,
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-suggestDateOptions" &&
      part.state === "output-available"
    ) {
      const dateOptions = extractDateOptions(part.output);
      if (!dateOptions) continue;

      const signature = `date_options:${dateOptions.question}:${dateOptions.options
        .map((option) => option.id)
        .join("|")}`;

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "date_options",
            data: dateOptions,
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-selectRoomType" &&
      part.state === "output-available"
    ) {
      const roomSelector = extractRoomTypeSelector(part.output);
      if (!roomSelector) continue;

      const signature = `room_selector:${roomSelector.question}:${roomSelector.rooms
        .map((room) => room.room_type_id)
        .join("|")}`;

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "room_type_selector",
            data: roomSelector,
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-getExperienceDetails" &&
      part.state === "output-available"
    ) {
      const details = extractExperienceDetails(part.output);
      if (!details) continue;

      const roomCount = Array.isArray(details.room_types)
        ? details.room_types.length
        : 0;
      const departureCount = Array.isArray(details.upcoming_departures)
        ? details.upcoming_departures.length
        : 0;
      const sessionCount = Array.isArray(details.upcoming_sessions)
        ? details.upcoming_sessions.length
        : 0;
      const signature = `experience_details:${details.experience.id}:${roomCount}:${departureCount}:${sessionCount}`;

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "experience_details",
            data: details,
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-getExperienceOptionDetails" &&
      part.state === "output-available"
    ) {
      const optionDetails = extractOptionDetails(part.output);
      if (!optionDetails) continue;

      const optionIds = optionDetails.options
        .map((option) =>
          isRecord(option) && typeof option.id === "string" ? option.id : "",
        )
        .filter(Boolean)
        .join("|");

      const signature = `option_details:${optionDetails.experience.id}:${optionDetails.option_type}:${optionIds}`;

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "option_details",
            data: optionDetails,
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

    const normalizedBlocks: ParsedBlock[] = [];

    for (const block of parsed) {
      if (!isRecord(block) || typeof block.type !== "string") continue;

      if (block.type === "text" && typeof block.content === "string") {
        const content = block.content.trim();
        if (!content) continue;
        normalizedBlocks.push({
          key: `text:${content}`,
          type: "text",
          content,
        });
        continue;
      }

      if (
        block.type === "ui" &&
        isRecord(block.content) &&
        typeof block.content.component === "string" &&
        isRecord(block.content.data)
      ) {
        const component = block.content.component;
        const data = block.content.data;
        normalizedBlocks.push({
          key: `${component}:${JSON.stringify(data)}`,
          type: "ui",
          content: { component, data },
        });
      }
    }

    return normalizedBlocks;
  }

  return [];
}

function UIBlock({
  component,
  data,
  onQuickReply,
}: {
  component: string;
  data: unknown;
  onQuickReply?: (reply: string) => void;
}) {
  switch (component) {
    case "experience_cards":
      if (!isExperienceCardsData(data)) return null;
      return (
        <ExperienceCardsGrid
          experiences={data.experiences as unknown as ExperienceGridItem[]}
        />
      );

    case "location_request":
      if (!isLocationRequestData(data)) return null;
      return <LocationRequest reason={data.reason} />;

    case "auth_required":
      if (!isAuthRequiredData(data)) return null;
      return <AuthRequiredCard reason={data.reason} />;

    case "quick_replies":
      if (!isQuickRepliesData(data)) return null;
      return (
        <QuickReplies
          question={data.question}
          options={data.options}
          allowFreeText={data.allow_free_text}
          disabled={!onQuickReply}
          onSelect={onQuickReply}
        />
      );

    case "date_options":
      if (!isDateOptionsData(data)) return null;
      return (
        <DateOptionsPicker
          question={data.question}
          options={data.options}
          allowFreeText={data.allow_free_text}
          disabled={!onQuickReply}
          onSelect={onQuickReply}
        />
      );

    case "room_type_selector":
      if (!isRoomTypeSelectorData(data)) return null;
      return (
        <RoomTypeSelector
          question={data.question}
          experienceTitle={data.experience_title}
          rooms={data.rooms}
          allowFreeText={data.allow_free_text}
          disabled={!onQuickReply}
          onSelect={onQuickReply}
        />
      );

    case "experience_details":
      if (!isExperienceDetailsData(data)) return null;
      return <ExperienceDetailsPanel details={data} />;

    case "option_details":
      if (!isExperienceOptionDetailsData(data)) return null;
      return <ExperienceOptionDetailsPanel details={data} />;

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
