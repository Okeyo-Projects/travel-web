"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { useChatContext } from "@/contexts/ChatContext";
import {
  useConversation,
  useCreateConversation,
  useSaveMessage,
} from "@/hooks/use-conversations";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { parseMessageContent } from "@/lib/chat/parse-message";
import { localizeHref, stripLocalePrefix } from "@/lib/routing/locale-path";
import { ChatInput } from "./ChatInput";
import { ChatWelcome } from "./ChatWelcome";
import { type AssistantFeedbackValue, MessageList } from "./MessageList";

interface BookingChatProps {
  initialConversationId?: string | null;
  initialMessage?: string;
}

interface PublicAgentConfigResponse {
  version_id: string | null;
  fallback_language: string;
  supported_languages: string[];
  welcome_messages: Record<
    string,
    {
      title: string;
      description: string;
    }
  >;
  suggested_prompts: Record<string, string[]>;
}

type ChatSendSource =
  | "typed"
  | "welcome_suggestion"
  | "quick_reply"
  | "initial_prompt";

type StoredConversationMessage = Pick<UIMessage, "id" | "role" | "parts"> & {
  content?: string | null;
};

type ChatMessage = UIMessage & {
  content?: string;
};

type AssistantResponseAnalyticsContext = {
  source: ChatSendSource | "unknown";
  latencyMs: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStreamingPart(part: unknown): boolean {
  if (!isRecord(part)) return false;
  const state = part.state;
  return typeof state === "string" && state.includes("stream");
}

function sanitizeMessageParts(parts: unknown): unknown[] | undefined {
  if (!Array.isArray(parts)) return undefined;

  const filtered = parts.filter((part) => {
    if (!isRecord(part)) return false;

    if (part.type === "step-start") return false;
    if (isStreamingPart(part)) return false;

    if (part.type === "text") {
      const text = part.text;
      return typeof text === "string" && text.trim().length > 0;
    }

    return true;
  });

  return filtered.length > 0 ? filtered : undefined;
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => {
      if (!isRecord(part)) return "";
      if (part.type !== "text") return "";
      return typeof part.text === "string" ? part.text : "";
    })
    .filter((value) => value.trim().length > 0)
    .join("\n")
    .trim();
}

function extractToolNames(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];

  const toolNames = new Set<string>();

  for (const part of parts) {
    if (!isRecord(part)) continue;

    const type = part.type;
    if (typeof type !== "string" || !type.startsWith("tool-")) continue;

    const toolName = type.slice(5).trim();
    if (toolName.length > 0) {
      toolNames.add(toolName);
    }
  }

  return Array.from(toolNames);
}

function extractUiComponentNames(message: ChatMessage): string[] {
  const componentNames = new Set<string>();

  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (!isRecord(part)) continue;

      const recordPart = part as Record<string, unknown>;
      const state = recordPart.state;
      if (state !== "output-available") continue;

      switch (recordPart.type) {
        case "tool-searchExperiences":
          componentNames.add("experience_cards");
          break;
        case "tool-requestUserLocation":
          componentNames.add("location_request");
          break;
        case "tool-offerQuickReplies":
          componentNames.add("quick_replies");
          break;
        case "tool-suggestDateOptions":
          componentNames.add("date_options");
          break;
        case "tool-selectRoomType":
          componentNames.add("room_type_selector");
          break;
        case "tool-getExperienceDetails":
          componentNames.add("experience_details");
          break;
        case "tool-getExperienceOptionDetails":
          componentNames.add("option_details");
          break;
        case "tool-createBookingIntent":
          if (
            isRecord(recordPart.output) &&
            recordPart.output.requires_auth === true
          ) {
            componentNames.add("auth_required");
          } else if (
            isRecord(recordPart.output) &&
            recordPart.output.success === true &&
            typeof recordPart.output.booking_id === "string"
          ) {
            componentNames.add("booking_confirm");
          }
          break;
        default:
          break;
      }
    }
  }

  if (typeof message.content === "string" && message.content.trim()) {
    const parsedContent = parseMessageContent(message.content);
    for (const block of parsedContent) {
      if (
        block.type === "ui" &&
        isRecord(block.content) &&
        typeof block.content.component === "string"
      ) {
        componentNames.add(block.content.component);
      }
    }
  }

  return Array.from(componentNames);
}

function truncateAnalyticsText(text: string, maxLength = 140): string | null {
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function hasRenderableAssistantContent(
  content: string,
  parts: unknown[] | undefined,
): boolean {
  if (content.trim().length > 0) return true;
  if (!parts || parts.length === 0) return false;

  return parts.some((part) => {
    if (!isRecord(part)) return false;

    if (part.type === "text") {
      return typeof part.text === "string" && part.text.trim().length > 0;
    }

    const state = part.state;
    return (
      state === "done" ||
      state === "output-available" ||
      state === "input-available"
    );
  });
}

function shouldPersistMessage(
  message: ChatMessage,
  status: "submitted" | "streaming" | "ready" | "error",
): boolean {
  if (message.role !== "assistant") return true;
  if (status !== "ready") return false;

  if (Array.isArray(message.parts) && message.parts.some(isStreamingPart)) {
    return false;
  }

  const content = typeof message.content === "string" ? message.content : "";
  const sanitizedParts = sanitizeMessageParts(message.parts);
  return hasRenderableAssistantContent(content, sanitizedParts);
}

function buildPersistedMessagePayload(message: ChatMessage) {
  const sanitizedParts = sanitizeMessageParts(message.parts);
  const contentFromMessage =
    typeof message.content === "string" ? message.content.trim() : "";
  const contentFromParts = extractTextFromParts(sanitizedParts);
  const content = contentFromMessage || contentFromParts;

  return {
    role: message.role,
    content,
    parts: sanitizedParts,
  };
}

export function BookingChat({
  initialConversationId,
  initialMessage,
}: BookingChatProps) {
  const { locale, t } = useSiteI18n();
  const {
    userLocation,
    setUserLocation,
    sessionId,
    conversationId,
    setConversationId,
    newConversationNonce,
    clientId,
    lockedBookingId,
    setLockedBookingId,
    lockedConversationId,
    setLockedConversationId,
    startNewConversation,
  } = useChatContext();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [messageFeedbackById, setMessageFeedbackById] = useState<
    Partial<Record<string, AssistantFeedbackValue>>
  >({});
  const [publicAgentConfig, setPublicAgentConfig] =
    useState<PublicAgentConfigResponse | null>(null);
  const pathname = usePathname();
  const isSendingRef = useRef(false);
  const inFlightTextRef = useRef<string | null>(null);
  const persistedMessageIds = useRef(new Set<string>());
  const persistingMessageIds = useRef(new Set<string>());
  const trackedResponseMessageIds = useRef(new Set<string>());
  const assistantResponseContextRef = useRef(
    new Map<string, AssistantResponseAnalyticsContext>(),
  );
  const hasTrackedBookingCreatedRef = useRef(false);
  const hasTrackedInputFocusRef = useRef(false);
  const pendingResponseRef = useRef<{
    source: ChatSendSource;
    startedAt: number;
  } | null>(null);
  const previousPathname = useRef(pathname);
  const activeConversationId = initialConversationId || conversationId;
  const isConversationLocked =
    !!activeConversationId &&
    !!lockedBookingId &&
    lockedConversationId === activeConversationId;

  const { data: conversationData, isLoading: loadingConversation } =
    useConversation(initialConversationId || null);
  const createConversation = useCreateConversation();
  const saveMessage = useSaveMessage();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
      }),
    [],
  );

  const { messages, status, sendMessage, setMessages } = useChat<ChatMessage>({
    transport,
    messages: [],
  });

  const browserLanguage = useMemo(() => {
    if (!mounted || typeof navigator === "undefined") return null;

    const language = navigator.language?.toLowerCase() || "";
    if (language.startsWith("fr")) return "fr";
    if (language.startsWith("ar")) return "ar";
    if (language.startsWith("en")) return "en";
    return null;
  }, [mounted]);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") {
      isSendingRef.current = false;
      inFlightTextRef.current = null;
    }
  }, [status]);

  // Restore or clear locked state when changing conversations
  useEffect(() => {
    if (!activeConversationId) {
      if (lockedConversationId !== null) setLockedConversationId(null);
      if (lockedBookingId !== null) setLockedBookingId(null);
      return;
    }

    if (loadingConversation) return;
    if (!conversationData?.conversation) return;

    const conv = conversationData?.conversation as
      | Record<string, unknown>
      | undefined;
    const conversationBookingId =
      typeof conv?.booking_id === "string" ? conv.booking_id : null;
    const conversationLocked = !!conv?.locked_at && !!conversationBookingId;

    if (conversationLocked) {
      if (lockedConversationId !== activeConversationId) {
        setLockedConversationId(activeConversationId);
      }
      if (lockedBookingId !== conversationBookingId) {
        setLockedBookingId(conversationBookingId);
      }
      return;
    }

    if (
      lockedConversationId === activeConversationId ||
      lockedBookingId !== null
    ) {
      setLockedConversationId(null);
      setLockedBookingId(null);
    }
  }, [
    activeConversationId,
    conversationData,
    loadingConversation,
    lockedBookingId,
    lockedConversationId,
    setLockedBookingId,
    setLockedConversationId,
  ]);

  // Load existing messages from conversation
  useEffect(() => {
    if (!conversationData) return;

    const loadedMessages: ChatMessage[] = (conversationData.messages || []).map(
      (msg: StoredConversationMessage) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content || "",
        parts: msg.parts,
      }),
    );

    setMessages(loadedMessages);
    persistedMessageIds.current.clear();
    persistingMessageIds.current.clear();
    trackedResponseMessageIds.current.clear();
    assistantResponseContextRef.current.clear();
    setMessageFeedbackById({});

    // Mark loaded messages as already persisted
    loadedMessages.forEach((msg: ChatMessage) => {
      persistedMessageIds.current.add(msg.id);
      trackedResponseMessageIds.current.add(msg.id);
    });
  }, [conversationData, setMessages]);

  // Set conversationId from URL param
  useEffect(() => {
    if (initialConversationId && initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      // Only clear messages if conversationData hasn't loaded yet.
      // If data is already cached, the loadMessages effect above already set them —
      // clearing here would erase them since effects run in definition order.
      if (!conversationData) {
        setMessages([]);
        persistedMessageIds.current.clear();
        persistingMessageIds.current.clear();
        assistantResponseContextRef.current.clear();
        setMessageFeedbackById({});
      }
    }
  }, [
    initialConversationId,
    conversationId,
    conversationData,
    setConversationId,
    setMessages,
  ]);

  // Hard reset UI state when user starts a new conversation
  useEffect(() => {
    if (newConversationNonce === 0) return;

    setMessages([]);
    setInput("");
    setIsCreatingConversation(false);
    isSendingRef.current = false;
    inFlightTextRef.current = null;
    persistedMessageIds.current.clear();
    persistingMessageIds.current.clear();
    trackedResponseMessageIds.current.clear();
    assistantResponseContextRef.current.clear();
    hasTrackedInputFocusRef.current = false;
    pendingResponseRef.current = null;
    setMessageFeedbackById({});
  }, [newConversationNonce, setMessages]);

  // Reset when navigating from /chat/:id -> /chat (e.g., navbar click)
  useEffect(() => {
    const normalizedPathname = stripLocalePrefix(pathname);
    const normalizedPreviousPathname = stripLocalePrefix(
      previousPathname.current,
    );
    const movedToRootChat =
      normalizedPathname === "/chat" && normalizedPreviousPathname !== "/chat";

    previousPathname.current = pathname;

    if (!movedToRootChat) return;

    setConversationId(null);
    setLockedBookingId(null);
    setLockedConversationId(null);
    setMessages([]);
    setInput("");
    setIsCreatingConversation(false);
    isSendingRef.current = false;
    inFlightTextRef.current = null;
    persistedMessageIds.current.clear();
    persistingMessageIds.current.clear();
    trackedResponseMessageIds.current.clear();
    assistantResponseContextRef.current.clear();
    hasTrackedInputFocusRef.current = false;
    pendingResponseRef.current = null;
    setMessageFeedbackById({});
  }, [
    pathname,
    setConversationId,
    setLockedBookingId,
    setLockedConversationId,
    setMessages,
  ]);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-send initial message from home page input
  const hasSentInitialMessage = useRef(false);
  const sendInitialMessage = useEffectEvent((message: string) => {
    void sendUserMessage(message, "initial_prompt");
  });

  useEffect(() => {
    if (!mounted || !initialMessage || hasSentInitialMessage.current) return;
    hasSentInitialMessage.current = true;
    sendInitialMessage(initialMessage);
  }, [mounted, initialMessage, sendInitialMessage]);

  // Load public agent config for welcome messages and suggestions
  useEffect(() => {
    let isCancelled = false;

    const loadPublicConfig = async () => {
      try {
        const response = await fetch("/api/ai/config/public", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as PublicAgentConfigResponse;
        if (isCancelled) return;
        setPublicAgentConfig(data);
      } catch (error) {
        console.warn("Failed to load public agent config:", error);
      }
    };

    void loadPublicConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      hasTrackedInputFocusRef.current = false;
    }
  }, [activeConversationId]);

  // Persist new messages to database
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;

    // Find messages that haven't been persisted yet
    const messagesToPersist = messages.filter((message) => {
      if (persistedMessageIds.current.has(message.id)) return false;
      if (persistingMessageIds.current.has(message.id)) return false;
      return shouldPersistMessage(message, status);
    });

    if (messagesToPersist.length === 0) return;

    // Persist each new message
    messagesToPersist.forEach((message) => {
      const payload = buildPersistedMessagePayload(message);
      persistingMessageIds.current.add(message.id);

      saveMessage.mutate(
        {
          conversationId: activeConversationId,
          message: payload,
        },
        {
          onSuccess: () => {
            persistingMessageIds.current.delete(message.id);
            persistedMessageIds.current.add(message.id);
          },
          onError: () => {
            persistingMessageIds.current.delete(message.id);
          },
        },
      );
    });
  }, [activeConversationId, messages, saveMessage, status]);

  useEffect(() => {
    const assistantMessages = messages.filter((message) => {
      if (message.role !== "assistant") return false;
      if (trackedResponseMessageIds.current.has(message.id)) return false;
      return shouldPersistMessage(message, status);
    });

    if (assistantMessages.length === 0) return;

    const pendingResponse = pendingResponseRef.current;
    const latencyMs = pendingResponse
      ? Math.max(0, Math.round(performance.now() - pendingResponse.startedAt))
      : null;

    for (const message of assistantMessages) {
      const payload = buildPersistedMessagePayload(message);
      const responseText = payload.content ?? "";
      const toolNames = extractToolNames(message.parts);

      captureEvent(ANALYTICS_EVENT.AI_RESPONSE_RECEIVED, {
        conversation_id: activeConversationId,
        has_tool_call: toolNames.length > 0,
        latency_ms: latencyMs,
        response_length: responseText.length,
        source: pendingResponse?.source ?? "unknown",
        tool_count: toolNames.length,
      });

      assistantResponseContextRef.current.set(message.id, {
        source: pendingResponse?.source ?? "unknown",
        latencyMs,
      });

      for (const toolName of toolNames) {
        captureEvent(ANALYTICS_EVENT.AI_TOOL_USED, {
          conversation_id: activeConversationId,
          source: pendingResponse?.source ?? "unknown",
          tool_name: toolName,
        });
      }

      trackedResponseMessageIds.current.add(message.id);
    }

    pendingResponseRef.current = null;
  }, [activeConversationId, messages, status]);

  const sendUserMessage = async (
    text: string,
    source: ChatSendSource = "typed",
  ) => {
    const normalizedText = text.trim();
    if (
      !normalizedText ||
      isLoading ||
      isConversationLocked ||
      isCreatingConversation ||
      isSendingRef.current ||
      inFlightTextRef.current === normalizedText
    ) {
      return;
    }

    let currentConvId = activeConversationId;
    isSendingRef.current = true;
    inFlightTextRef.current = normalizedText;
    pendingResponseRef.current = {
      source,
      startedAt: performance.now(),
    };

    try {
      // Create conversation if this is the first message
      if (!currentConvId) {
        setIsCreatingConversation(true);
        const result = await createConversation.mutateAsync({
          clientId: clientId || undefined,
          userLocation: userLocation || undefined,
        });

        currentConvId = result.conversation.id;
        captureEvent(ANALYTICS_EVENT.CHAT_STARTED, {
          conversation_id: currentConvId,
          source,
        });
        setConversationId(currentConvId);

        // Update URL without navigation (to preserve component state)
        window.history.replaceState(
          null,
          "",
          localizeHref(`/chat/${currentConvId}`, pathname),
        );
      }

      setInput("");
      captureEvent(ANALYTICS_EVENT.CHAT_MESSAGE_SENT, {
        conversation_id: currentConvId,
        has_tool_call: false,
        message_length: normalizedText.length,
        source,
      });
      await sendMessage(
        { text: normalizedText },
        {
          body: {
            sessionId,
            conversationId: currentConvId,
            userLocation: userLocation
              ? { lat: userLocation.lat, lng: userLocation.lng }
              : null,
          },
        },
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      captureEvent(ANALYTICS_EVENT.CHAT_MESSAGE_FAILED, {
        error_message: error instanceof Error ? error.message : String(error),
        source,
      });
      isSendingRef.current = false;
      inFlightTextRef.current = null;
      pendingResponseRef.current = null;
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendUserMessage(input);
  };

  const handleSuggestionClick = async (prompt: string) => {
    captureEvent(ANALYTICS_EVENT.CHAT_SUGGESTION_CLICKED, {
      prompt_length: prompt.length,
    });
    await sendUserMessage(prompt, "welcome_suggestion");
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleRequestLocation = () => {
    captureEvent(ANALYTICS_EVENT.CHAT_LOCATION_REQUESTED, {
      conversation_id: activeConversationId,
    });

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        captureEvent(ANALYTICS_EVENT.CHAT_LOCATION_GRANTED, {
          conversation_id: activeConversationId,
        });
        setUserLocation({
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        captureEvent(ANALYTICS_EVENT.CHAT_LOCATION_DENIED, {
          conversation_id: activeConversationId,
          error_code: error.code,
        });
      },
    );
  };

  const handleInputFocus = () => {
    if (hasTrackedInputFocusRef.current) return;

    captureEvent(ANALYTICS_EVENT.CHAT_INPUT_FOCUSED, {
      conversation_id: activeConversationId,
      has_messages: messages.length > 0,
    });
    hasTrackedInputFocusRef.current = true;
  };

  const handleQuickReply = async (reply: string) => {
    captureEvent(ANALYTICS_EVENT.CHAT_QUICK_REPLY_SELECTED, {
      conversation_id: activeConversationId,
      reply_length: reply.length,
    });
    await sendUserMessage(reply, "quick_reply");
  };

  const handleAssistantFeedback = (
    messageId: string,
    feedbackValue: AssistantFeedbackValue,
  ) => {
    const currentFeedback = messageFeedbackById[messageId];
    if (currentFeedback === feedbackValue) return;

    const messageIndex = messages.findIndex(
      (message) => message.id === messageId,
    );
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.role !== "assistant") return;

    const payload = buildPersistedMessagePayload(message);
    const responseText = payload.content ?? "";
    const responsePreview = truncateAnalyticsText(responseText);
    const toolNames = extractToolNames(message.parts);
    const uiComponents = extractUiComponentNames(message);
    const responseIndex = messages
      .slice(0, messageIndex + 1)
      .filter((entry) => entry.role === "assistant").length;
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .toReversed()
      .find((entry) => entry.role === "user");
    const previousUserPayload = previousUserMessage
      ? buildPersistedMessagePayload(previousUserMessage)
      : null;
    const previousUserText = previousUserPayload?.content ?? "";
    const previousUserPreview = truncateAnalyticsText(previousUserText);
    const responseContext = assistantResponseContextRef.current.get(messageId);

    captureEvent(ANALYTICS_EVENT.AI_RESPONSE_FEEDBACK_SUBMITTED, {
      conversation_id: activeConversationId,
      message_id: messageId,
      feedback_value: feedbackValue,
      feedback_changed: typeof currentFeedback === "string",
      source: responseContext?.source ?? "unknown",
      latency_ms: responseContext?.latencyMs ?? null,
      response_index: responseIndex,
      total_messages: messages.length,
      has_user_location: !!userLocation,
      is_conversation_locked: isConversationLocked,
      booking_id: lockedBookingId,
      preceding_user_message_length: previousUserText.length || null,
      preceding_user_message_preview: previousUserPreview,
      response_length: responseText.length,
      response_preview: responsePreview,
      tool_count: toolNames.length,
      tool_names: toolNames.length > 0 ? toolNames.join(",") : null,
      ui_component_count: uiComponents.length,
      ui_components: uiComponents.length > 0 ? uiComponents.join(",") : null,
      has_tool_call: toolNames.length > 0,
    });

    setMessageFeedbackById((current) => ({
      ...current,
      [messageId]: feedbackValue,
    }));
  };

  useEffect(() => {
    if (!lockedBookingId || hasTrackedBookingCreatedRef.current) return;

    captureEvent(ANALYTICS_EVENT.CHAT_BOOKING_CREATED, {
      booking_id: lockedBookingId,
      conversation_id: activeConversationId,
    });
    hasTrackedBookingCreatedRef.current = true;
  }, [activeConversationId, lockedBookingId]);

  useEffect(() => {
    if (lockedBookingId) return;
    hasTrackedBookingCreatedRef.current = false;
  }, [lockedBookingId]);

  if (!mounted || loadingConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show welcome screen if:
  // - No messages yet
  // - No active conversation selected
  // - NOT in the process of creating a conversation
  const showWelcome =
    messages.length === 0 && !activeConversationId && !isCreatingConversation;

  const fallbackLanguage = publicAgentConfig?.fallback_language || "fr";
  const supportedLanguagesRaw = publicAgentConfig?.supported_languages ?? [];
  const supportedLanguages =
    supportedLanguagesRaw.length > 0
      ? supportedLanguagesRaw
      : ["fr", "en", "ar"];
  const effectiveLanguage = supportedLanguages.includes(locale)
    ? locale
    : browserLanguage && supportedLanguages.includes(browserLanguage)
      ? browserLanguage
      : fallbackLanguage;

  const welcomeEntry =
    publicAgentConfig?.welcome_messages?.[effectiveLanguage] ||
    publicAgentConfig?.welcome_messages?.[fallbackLanguage];

  const suggestedPrompts =
    publicAgentConfig?.suggested_prompts?.[effectiveLanguage] ||
    publicAgentConfig?.suggested_prompts?.[fallbackLanguage];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background relative overflow-hidden">
      {/* Messages Area */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col"
            >
              <ChatWelcome
                onSelectSuggestion={handleSuggestionClick}
                disabled={isLoading || isCreatingConversation}
                welcomeTitle={welcomeEntry?.title}
                welcomeDescription={welcomeEntry?.description}
                suggestedPrompts={suggestedPrompts}
              />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-full flex flex-col"
            >
              <MessageList
                messages={messages}
                isLoading={isLoading}
                onQuickReply={(reply) => void handleQuickReply(reply)}
                messageFeedbackById={messageFeedbackById}
                onAssistantFeedback={handleAssistantFeedback}
                activeConversationId={activeConversationId}
                lockedBookingId={isConversationLocked ? lockedBookingId : null}
                isConversationLocked={isConversationLocked}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area — hidden when conversation is locked after a booking */}
      <div
        className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-2 sm:pt-4"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {isConversationLocked ? (
          <div className="w-full max-w-3xl mx-auto px-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-4 py-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {t("chat.locked.title")}
                </p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                  {t("chat.locked.description")}
                </p>
              </div>
              <button
                type="button"
                onClick={startNewConversation}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {t("chat.locked.newConversation")}
              </button>
            </div>
          </div>
        ) : (
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            onSubmitMessage={() => void sendUserMessage(input)}
            onInputFocus={handleInputFocus}
            isLoading={isLoading}
            onRequestLocation={handleRequestLocation}
          />
        )}
      </div>
    </div>
  );
}
