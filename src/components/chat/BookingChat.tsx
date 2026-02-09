"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatContext } from "@/contexts/ChatContext";
import {
  useConversation,
  useCreateConversation,
  useSaveMessage,
} from "@/hooks/use-conversations";
import { ChatInput } from "./ChatInput";
import { ChatWelcome } from "./ChatWelcome";
import { MessageList } from "./MessageList";

interface BookingChatProps {
  initialConversationId?: string | null;
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

type StoredConversationMessage = Pick<UIMessage, "id" | "role" | "parts"> & {
  content?: string | null;
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
  message: UIMessage,
  status: "submitted" | "streaming" | "ready" | "error",
): boolean {
  const messageAny = message as any;
  if (message.role !== "assistant") return true;
  if (status !== "ready") return false;

  if (Array.isArray(message.parts) && message.parts.some(isStreamingPart)) {
    return false;
  }

  const content =
    typeof messageAny.content === "string" ? messageAny.content : "";
  const sanitizedParts = sanitizeMessageParts(message.parts);
  return hasRenderableAssistantContent(content, sanitizedParts);
}

function buildPersistedMessagePayload(message: UIMessage) {
  const messageAny = message as any;
  const sanitizedParts = sanitizeMessageParts(message.parts);
  const contentFromMessage =
    typeof messageAny.content === "string" ? messageAny.content.trim() : "";
  const contentFromParts = extractTextFromParts(sanitizedParts);
  const content = contentFromMessage || contentFromParts;

  return {
    role: message.role,
    content,
    parts: sanitizedParts,
  };
}

export function BookingChat({ initialConversationId }: BookingChatProps) {
  const {
    userLocation,
    setUserLocation,
    sessionId,
    conversationId,
    setConversationId,
    newConversationNonce,
    clientId,
  } = useChatContext();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [publicAgentConfig, setPublicAgentConfig] =
    useState<PublicAgentConfigResponse | null>(null);
  const pathname = usePathname();
  const isSendingRef = useRef(false);
  const inFlightTextRef = useRef<string | null>(null);
  const persistedMessageIds = useRef(new Set<string>());
  const persistingMessageIds = useRef(new Set<string>());
  const previousPathname = useRef(pathname);
  const activeConversationId = initialConversationId || conversationId;

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

  const { messages, status, sendMessage, setMessages } = (useChat as any)({
    transport,
    initialMessages: [],
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
    if (status === "ready") {
      isSendingRef.current = false;
      inFlightTextRef.current = null;
    }
  }, [status]);

  // Load existing messages from conversation
  useEffect(() => {
    if (!conversationData) return;

    const loadedMessages = (conversationData.messages || []).map(
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

    // Mark loaded messages as already persisted
    loadedMessages.forEach((msg: any) => {
      persistedMessageIds.current.add(msg.id);
    });
  }, [conversationData, setMessages]);

  // Set conversationId from URL param
  useEffect(() => {
    if (initialConversationId && initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      setMessages([]);
      persistedMessageIds.current.clear();
      persistingMessageIds.current.clear();
    }
  }, [initialConversationId, conversationId, setConversationId, setMessages]);

  // Hard reset UI state when user starts a new conversation
  useEffect(() => {
    if (newConversationNonce === 0) return;

    setMessages([]);
    setInput("");
    setIsCreatingConversation(false);
    persistedMessageIds.current.clear();
    persistingMessageIds.current.clear();
  }, [newConversationNonce, setMessages]);

  // Reset when navigating from /chat/:id -> /chat (e.g., navbar click)
  useEffect(() => {
    const movedToRootChat =
      pathname === "/chat" && previousPathname.current !== "/chat";

    previousPathname.current = pathname;

    if (!movedToRootChat) return;

    setConversationId(null);
    setMessages([]);
    setInput("");
    setIsCreatingConversation(false);
    persistedMessageIds.current.clear();
    persistingMessageIds.current.clear();
  }, [pathname, setConversationId, setMessages]);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Persist new messages to database
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;

    // Find messages that haven't been persisted yet
    const messagesToPersist = messages.filter((message: any) => {
      if (persistedMessageIds.current.has(message.id)) return false;
      if (persistingMessageIds.current.has(message.id)) return false;
      return shouldPersistMessage(message, status);
    });

    if (messagesToPersist.length === 0) return;

    // Persist each new message
    messagesToPersist.forEach((message: any) => {
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

  const sendUserMessage = async (text: string) => {
    const normalizedText = text.trim();
    if (
      !normalizedText ||
      isLoading ||
      isCreatingConversation ||
      isSendingRef.current ||
      inFlightTextRef.current === normalizedText
    ) {
      return;
    }

    let currentConvId = activeConversationId;
    isSendingRef.current = true;
    inFlightTextRef.current = normalizedText;

    try {
      // Create conversation if this is the first message
      if (!currentConvId) {
        setIsCreatingConversation(true);
        const result = await createConversation.mutateAsync({
          clientId: clientId || undefined,
          userLocation: userLocation || undefined,
        });

        currentConvId = result.conversation.id;
        setConversationId(currentConvId);

        // Update URL without navigation (to preserve component state)
        window.history.replaceState(null, "", `/chat/${currentConvId}`);
      }

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
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      isSendingRef.current = false;
      inFlightTextRef.current = null;
    } finally {
      setIsCreatingConversation(false);
    }
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
        console.error("Error getting location:", error);
      },
    );
  };

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
  const effectiveLanguage =
    browserLanguage && supportedLanguages.includes(browserLanguage)
      ? browserLanguage
      : fallbackLanguage;

  const welcomeEntry =
    publicAgentConfig?.welcome_messages?.[effectiveLanguage] ||
    publicAgentConfig?.welcome_messages?.[fallbackLanguage];

  const suggestedPrompts =
    publicAgentConfig?.suggested_prompts?.[effectiveLanguage] ||
    publicAgentConfig?.suggested_prompts?.[fallbackLanguage];

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
          onSubmitMessage={() => void sendUserMessage(input)}
          isLoading={isLoading}
          onRequestLocation={handleRequestLocation}
        />
      </div>
    </div>
  );
}
