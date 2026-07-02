"use client";

import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { Compass, ThumbsDown, ThumbsUp } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { isChatDeepLinkBootstrapText } from "@/lib/chat/deep-link";
import { parseMessageContent } from "@/lib/chat/parse-message";
import { cn } from "@/lib/utils";
import type { GuideItemChatCardData } from "@/types/guide-items";
import { AuthRequiredCard } from "./AuthRequiredCard";
import {
  BookingConfirmCard,
  type BookingIntentSummary,
} from "./BookingConfirmCard";
import { type DateOptionItem, DateOptionsPicker } from "./DateOptionsPicker";
import {
  ExperienceCardsGrid,
  type ExperienceGridItem,
} from "./ExperienceCardsGrid";
import {
  type ExperienceDetailsData,
  ExperienceDetailsPanel,
} from "./ExperienceDetailsPanel";
import {
  type ExperienceOptionDetailsData,
  ExperienceOptionDetailsPanel,
} from "./ExperienceOptionDetailsPanel";
import { GuideItemCardsGrid } from "./GuideItemCardsGrid";
import { LocationRequest } from "./LocationRequest";
import { QuickReplies } from "./QuickReplies";
import { type RoomTypeOptionItem, RoomTypeSelector } from "./RoomTypeSelector";
import { TripPlanBlock, type TripPlanData } from "./TripPlanBlock";

type Message = UIMessage & { content?: string | null };
type ExperienceResult = Record<string, unknown>;
type UIData = unknown;

type ParsedBlock =
  | { key: string; type: "text"; content: string }
  | { key: string; type: "ui"; content: { component: string; data: UIData } };

export type AssistantFeedbackValue = "positive" | "negative";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  leadingContent?: ReactNode;
  onQuickReply?: (reply: string) => void;
  messageFeedbackById?: Partial<Record<string, AssistantFeedbackValue>>;
  onAssistantFeedback?: (
    messageId: string,
    value: AssistantFeedbackValue,
  ) => void;
  onBookingConfirmed?: (summary: BookingIntentSummary) => void;
  activeConversationId?: string | null;
  lockedBookingId?: string | null;
  isConversationLocked?: boolean;
}

function getLastAssistantTextLength(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    const parts = message.parts || [];
    let length = 0;
    for (const part of parts) {
      if (isTextPart(part)) {
        length += part.text.length;
      }
    }
    if (
      typeof message.content === "string" &&
      message.content.length > length
    ) {
      length = message.content.length;
    }
    return length;
  }
  return 0;
}

type TextPart = { type: "text"; text: string };
type ToolPart = { type?: string; state?: string; output?: unknown };

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  const keyCounts = new Map<string, number>();
  const getKey = (prefix: string, value: string) => {
    const baseKey = `${prefix}-${value}`;
    const count = keyCounts.get(baseKey) ?? 0;
    keyCounts.set(baseKey, count + 1);
    return `${baseKey}-${count}`;
  };

  return tokens.map((token) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={getKey("strong", token)}>{token.slice(2, -2)}</strong>
      );
    }

    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={getKey("code", token)}
          className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono break-all"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={getKey("text", token)}>{token}</Fragment>;
  });
}

/**
 * Strip raw checkout URLs from AI text since there is no /checkout/ page
 * and the UI handles confirmation via BookingConfirmCard.
 */
function stripCheckoutUrls(text: string): string {
  // Handle backtick-wrapped URLs first, then bare URLs
  return text
    .replace(/`\s*\/checkout\/[a-zA-Z0-9_-]+\s*`/gi, "")
    .replace(/\s*\/checkout\/[a-zA-Z0-9_-]+[.,;:!?]?\s*/gi, " ")
    .trim();
}

function renderAssistantText(text: string): ReactNode {
  const normalized = stripCheckoutUrls(text).replaceAll("\r\n", "\n").trim();
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
        <ul
          key={`ul-${blockIndex}`}
          className="list-disc space-y-1 [padding-inline-start:1.5rem]"
        >
          {(() => {
            const listItemCounts = new Map<string, number>();
            return items.map((item) => {
              const count = listItemCounts.get(item) ?? 0;
              listItemCounts.set(item, count + 1);
              return (
                <li key={`li-${blockIndex}-${item}-${count}`}>
                  {renderInlineMarkdown(item)}
                </li>
              );
            });
          })()}
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
        <ol
          key={`ol-${blockIndex}`}
          className="list-decimal space-y-1 [padding-inline-start:1.5rem]"
        >
          {(() => {
            const orderedItemCounts = new Map<string, number>();
            return items.map((item) => {
              const count = orderedItemCounts.get(item) ?? 0;
              orderedItemCounts.set(item, count + 1);
              return (
                <li key={`oli-${blockIndex}-${item}-${count}`}>
                  {renderInlineMarkdown(item)}
                </li>
              );
            });
          })()}
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
      if (isHeadingLine(next) || isBulletLine(next) || isOrderedLine(next))
        break;
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

function extractLinkedExperienceResults(
  output: unknown,
): ExperienceResult[] | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (!Array.isArray(output.linked_experiences)) return null;
  return output.linked_experiences.filter(isRecord);
}

function extractGuideItemCards(
  output: unknown,
): GuideItemChatCardData[] | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (output.type !== "guide_item_cards") return null;
  if (!Array.isArray(output.items)) return null;
  return output.items.filter(
    (item): item is GuideItemChatCardData =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.slug === "string" &&
      typeof item.kind_slug === "string" &&
      typeof item.city_slug === "string" &&
      typeof item.title === "string",
  );
}

function extractTripPlan(output: unknown): TripPlanData | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (output.type !== "trip_plan") return null;
  if (typeof output.city !== "string") return null;
  if (!Array.isArray(output.plan) || output.plan.length === 0) return null;
  return output as unknown as TripPlanData;
}

function extractLocationReason(output: unknown): string {
  if (!isRecord(output)) return "";

  const reason = output.reason ?? output.message;
  if (typeof reason === "string" && reason.trim()) {
    return reason;
  }

  return "";
}

function extractAuthRequiredReason(output: unknown): string | null {
  if (!isRecord(output) || output.requires_auth !== true) return null;

  if (typeof output.error === "string" && output.error.trim()) {
    return output.error;
  }

  return "";
}

function extractBookingIntent(output: unknown): BookingIntentSummary | null {
  if (!isRecord(output) || output.success !== true) return null;
  if (typeof output.booking_id !== "string") return null;
  if (!isRecord(output.summary)) return null;

  const s = output.summary;
  if (typeof s.total_cents !== "number") return null;
  if (typeof s.currency !== "string") return null;
  if (!Array.isArray(s.items) || s.items.length === 0) return null;

  const items = s.items
    .filter(isRecord)
    .map((item) => {
      if (typeof item.experience_title !== "string") return null;
      if (typeof item.from_date !== "string") return null;
      if (typeof item.to_date !== "string") return null;
      if (typeof item.adults !== "number") return null;
      return {
        experience_title: item.experience_title,
        experience_type:
          typeof item.experience_type === "string"
            ? item.experience_type
            : undefined,
        from_date: item.from_date,
        to_date: item.to_date,
        adults: item.adults,
        children: typeof item.children === "number" ? item.children : undefined,
        infants: typeof item.infants === "number" ? item.infants : undefined,
        nights: typeof item.nights === "number" ? item.nights : undefined,
        subtotal_cents:
          typeof item.subtotal_cents === "number"
            ? item.subtotal_cents
            : undefined,
        total_cents:
          typeof item.total_cents === "number" ? item.total_cents : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return {
    booking_id: output.booking_id,
    total_cents: s.total_cents,
    currency: s.currency,
    items,
  };
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

function isGuideItemCardsData(
  data: unknown,
): data is { items: GuideItemChatCardData[] } {
  return (
    isRecord(data) &&
    Array.isArray(data.items) &&
    data.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.city_slug === "string",
    )
  );
}

function isTripPlanData(data: unknown): data is TripPlanData {
  return (
    isRecord(data) &&
    data.success === true &&
    data.type === "trip_plan" &&
    typeof data.city === "string" &&
    Array.isArray(data.plan) &&
    data.plan.length > 0
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

function isBookingIntentSummary(data: unknown): data is BookingIntentSummary {
  if (!isRecord(data)) return false;
  if (typeof data.booking_id !== "string") return false;
  if (typeof data.total_cents !== "number") return false;
  if (typeof data.currency !== "string") return false;
  if (!Array.isArray(data.items) || data.items.length === 0) return false;
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
  leadingContent,
  onQuickReply,
  messageFeedbackById,
  onAssistantFeedback,
  onBookingConfirmed,
  activeConversationId,
  lockedBookingId,
  isConversationLocked = false,
}: MessageListProps) {
  const { t, dir } = useSiteI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastTextLengthRef = useRef(getLastAssistantTextLength(messages));

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;

    const currentMessagesLength = messages.length;
    const currentLastTextLength = getLastAssistantTextLength(messages);
    const hasNewMessage = currentMessagesLength > prevMessagesLengthRef.current;
    const hasNewText = currentLastTextLength > prevLastTextLengthRef.current;

    if (hasNewMessage || hasNewText) {
      const target = textEndRef.current ?? messagesEndRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    prevMessagesLengthRef.current = currentMessagesLength;
    prevLastTextLengthRef.current = currentLastTextLength;
  });

  return (
    <div
      dir={dir}
      className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6"
    >
      {leadingContent}

      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isLastMessage={message.id === messages.at(-1)?.id}
          isLoading={isLoading}
          onQuickReply={onQuickReply}
          messageFeedback={messageFeedbackById?.[message.id]}
          onAssistantFeedback={onAssistantFeedback}
          onBookingConfirmed={onBookingConfirmed}
          activeConversationId={activeConversationId}
          lockedBookingId={lockedBookingId}
          isConversationLocked={isConversationLocked}
          textEndRef={textEndRef}
        />
      ))}

      {isLoading && (
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="rounded-2xl bg-muted/40 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-muted-foreground animate-pulse">
            {t("chat.results.loadingThinking")}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}

function MessageItem({
  message,
  isLastMessage,
  isLoading,
  onQuickReply,
  messageFeedback,
  onAssistantFeedback,
  onBookingConfirmed,
  activeConversationId,
  lockedBookingId,
  isConversationLocked = false,
  textEndRef,
}: {
  message: Message;
  isLastMessage: boolean;
  isLoading: boolean;
  onQuickReply?: (reply: string) => void;
  messageFeedback?: AssistantFeedbackValue;
  onAssistantFeedback?: (
    messageId: string,
    value: AssistantFeedbackValue,
  ) => void;
  onBookingConfirmed?: (summary: BookingIntentSummary) => void;
  activeConversationId?: string | null;
  lockedBookingId?: string | null;
  isConversationLocked?: boolean;
  textEndRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const isUser = message.role === "user";
  const { t, dir } = useSiteI18n();
  const isRtl = dir === "rtl";

  if (isUser) {
    const text = extractUserMessageText(message);
    if (!text) return null;
    if (isChatDeepLinkBootstrapText(text)) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex", isRtl ? "justify-start" : "justify-end")}
      >
        <div className="bg-primary/5 text-foreground max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tr-sm px-4 sm:px-5 py-2.5 sm:py-3 text-[15px] sm:text-base">
          <p
            dir="auto"
            className="whitespace-pre-wrap break-words leading-relaxed [text-align:start]"
          >
            {text}
          </p>
        </div>
      </motion.div>
    );
  }

  const parsedContent = extractAssistantBlocks(message);
  if (parsedContent.length === 0) return null;
  const canSubmitFeedback = !isLoading || !isLastMessage;
  const afterMessageComponents = new Set<string>([
    "experience_cards",
    "experience_details",
    "option_details",
    "trip_plan",
    "quick_replies",
    "date_options",
    "room_type_selector",
    "location_request",
    "auth_required",
    "booking_confirm",
  ]);
  const textBlocks = parsedContent.filter((block) => block.type === "text");
  const afterMessageUIBlocks = parsedContent.filter(
    (block) =>
      block.type === "ui" &&
      afterMessageComponents.has(block.content.component),
  );
  const uncategorizedUIBlocks = parsedContent.filter(
    (block) =>
      block.type === "ui" &&
      !afterMessageComponents.has(block.content.component),
  );
  const deferAfterMessageBlocks = isLoading && isLastMessage;
  const orderedContent = [
    ...textBlocks,
    ...uncategorizedUIBlocks,
    ...(deferAfterMessageBlocks ? [] : afterMessageUIBlocks),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 sm:gap-4"
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Compass className="w-4 h-4 text-primary-foreground" />
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        <div ref={isLastMessage ? textEndRef : undefined} className="space-y-3">
          {textBlocks.map((block) => (
            <div
              key={block.key}
              dir="auto"
              className="prose prose-neutral dark:prose-invert max-w-none break-words text-[15px] sm:text-base"
            >
              {renderAssistantText(block.content)}
            </div>
          ))}
        </div>

        {orderedContent
          .filter((block) => block.type !== "text")
          .map((block) => (
            <div key={block.key} className="my-4">
              <UIBlock
                component={block.content.component}
                data={block.content.data}
                onQuickReply={onQuickReply}
                onBookingConfirmed={onBookingConfirmed}
                activeConversationId={activeConversationId}
                lockedBookingId={lockedBookingId}
                isConversationLocked={isConversationLocked}
              />
            </div>
          ))}

        {onAssistantFeedback && canSubmitFeedback ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              {messageFeedback
                ? t("chat.feedback.thanks")
                : t("chat.feedback.label")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("chat.feedback.helpful")}
              aria-pressed={messageFeedback === "positive"}
              title={t("chat.feedback.helpful")}
              onClick={() => onAssistantFeedback(message.id, "positive")}
              className={cn(
                "h-8 w-8 rounded-full text-muted-foreground",
                messageFeedback === "positive" &&
                  "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
              )}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("chat.feedback.notHelpful")}
              aria-pressed={messageFeedback === "negative"}
              title={t("chat.feedback.notHelpful")}
              onClick={() => onAssistantFeedback(message.id, "negative")}
              className={cn(
                "h-8 w-8 rounded-full text-muted-foreground",
                messageFeedback === "negative" &&
                  "bg-rose-100 text-rose-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
              )}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
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
  const hasTripPlan = parts.some(
    (rawPart) =>
      isRecord(rawPart) &&
      rawPart.type === "tool-planTripWithGuideItems" &&
      rawPart.state === "output-available" &&
      Boolean(extractTripPlan(rawPart.output)),
  );
  const tripPlanAccommodations = hasTripPlan
    ? parts
        .filter(
          (rawPart): rawPart is ToolPart =>
            isRecord(rawPart) &&
            rawPart.type === "tool-searchExperiences" &&
            rawPart.state === "output-available",
        )
        .flatMap((rawPart) => extractSearchResults(rawPart.output) ?? [])
        .filter(
          (experience): experience is ExperienceResult =>
            isRecord(experience) && experience.type === "lodging",
        )
    : [];

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
      if (
        hasTripPlan &&
        experiences.every(
          (experience) => isRecord(experience) && experience.type === "lodging",
        )
      ) {
        continue;
      }

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
      part.type === "tool-planTripWithGuideItems" &&
      part.state === "output-available"
    ) {
      const tripPlan = extractTripPlan(part.output);
      if (!tripPlan) continue;

      const accommodationIds = tripPlanAccommodations
        .map((experience) =>
          typeof experience.id === "string" ? experience.id : "",
        )
        .filter(Boolean)
        .join(",");
      const signature = `trip_plan:${tripPlan.city_slug}:${tripPlan.days_requested}:${accommodationIds}`;

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "trip_plan",
            data: {
              ...tripPlan,
              accommodations: tripPlanAccommodations,
            },
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-searchGuideItems" &&
      part.state === "output-available"
    ) {
      if (hasTripPlan) continue;
      const items = extractGuideItemCards(part.output);
      if (!items || items.length === 0) continue;

      const ids = items.map((item) => item.id).filter(Boolean);
      const signature =
        ids.length > 0
          ? `guide_item_cards:${ids.join(",")}`
          : "guide_item_cards:empty";

      pushUniqueBlock(
        {
          key: signature,
          type: "ui",
          content: {
            component: "guide_item_cards",
            data: { items },
          },
        },
        signature,
      );
    }

    if (
      part.type === "tool-getLinkedExperiences" &&
      part.state === "output-available"
    ) {
      const experiences = extractLinkedExperienceResults(part.output);
      if (!experiences || experiences.length === 0) continue;

      const ids = experiences
        .map((exp) => (typeof exp.id === "string" ? exp.id : ""))
        .filter(Boolean);

      const signature =
        ids.length > 0
          ? `linked_experience_cards:${ids.join(",")}`
          : "linked_experience_cards:empty";

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
      // Auth required case
      const authReason = extractAuthRequiredReason(part.output);
      if (authReason) {
        pushUniqueBlock(
          {
            key: `auth_required:${authReason}`,
            type: "ui",
            content: {
              component: "auth_required",
              data: { reason: authReason },
            },
          },
          `auth_required:${authReason}`,
        );
        continue;
      }

      // Success case — render the booking confirm card
      const bookingIntent = extractBookingIntent(part.output);
      if (bookingIntent) {
        const signature = `booking_confirm:${bookingIntent.booking_id}`;
        pushUniqueBlock(
          {
            key: signature,
            type: "ui",
            content: {
              component: "booking_confirm",
              data: bookingIntent,
            },
          },
          signature,
        );
      }
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
  onBookingConfirmed,
  activeConversationId,
  lockedBookingId,
  isConversationLocked = false,
}: {
  component: string;
  data: unknown;
  onQuickReply?: (reply: string) => void;
  onBookingConfirmed?: (summary: BookingIntentSummary) => void;
  activeConversationId?: string | null;
  lockedBookingId?: string | null;
  isConversationLocked?: boolean;
}) {
  const { t } = useSiteI18n();

  switch (component) {
    case "guide_item_cards":
      if (!isGuideItemCardsData(data)) return null;
      return <GuideItemCardsGrid items={data.items} />;

    case "experience_cards":
      if (!isExperienceCardsData(data)) return null;
      return (
        <ExperienceCardsGrid
          experiences={data.experiences as unknown as ExperienceGridItem[]}
        />
      );

    case "trip_plan":
      if (!isTripPlanData(data)) return null;
      return <TripPlanBlock plan={data} />;

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

    case "booking_confirm":
      if (!isBookingIntentSummary(data)) return null;
      if (
        isConversationLocked ||
        (lockedBookingId && lockedBookingId === data.booking_id)
      ) {
        return null;
      }
      return (
        <BookingConfirmCard
          summary={data}
          conversationId={activeConversationId}
          onBookingConfirmed={onBookingConfirmed}
        />
      );

    default:
      return (
        <div className="border rounded-lg p-4 bg-muted/50 font-mono text-xs">
          <p className="font-semibold mb-2">
            {t("chat.debug.component", { component })}
          </p>
          <pre className="overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}
