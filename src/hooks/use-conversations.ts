import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "./use-auth";

export interface Conversation {
  id: string;
  title: string | null;
  first_message: string | null;
  summary: string | null;
  booking_id: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string | null;
  parts?: unknown;
}

export interface ConversationThreadData {
  conversation: Conversation | null;
  messages: ConversationMessageRecord[];
}

interface LocationPayload {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface PersistedMessagePayload {
  role: string;
  content?: string;
  parts?: unknown;
  metadata?: Record<string, unknown>;
}

function buildConversationListSuffix(clientId: string) {
  const params = new URLSearchParams();

  if (clientId) {
    params.append("clientId", clientId);
  }

  return params.toString() ? `?${params.toString()}` : "";
}

export function getConversationQueryKey(
  conversationId: string | null,
  clientId: string,
) {
  return ["conversation", conversationId, clientId] as const;
}

async function fetchConversation(
  conversationId: string,
  clientId: string,
): Promise<ConversationThreadData> {
  const suffix = buildConversationListSuffix(clientId);
  const response = await fetch(`/api/conversations/${conversationId}${suffix}`);

  if (!response.ok) throw new Error("Failed to load conversation");

  const data = await response.json();
  return {
    conversation: data.conversation ?? null,
    messages: Array.isArray(data.messages)
      ? (data.messages as ConversationMessageRecord[])
      : [],
  };
}

export async function prefetchConversation(
  queryClient: QueryClient,
  conversationId: string,
  clientId: string,
) {
  await queryClient.prefetchQuery({
    queryKey: getConversationQueryKey(conversationId, clientId),
    queryFn: () => fetchConversation(conversationId, clientId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const { clientId } = useChatContext();
  const isAnonymousReady = !user && !authLoading && clientId.length > 0;
  const canLoadConversations = Boolean(user) || isAnonymousReady;

  const query = useQuery({
    queryKey: ["conversations", user?.id, clientId],
    queryFn: async () => {
      const suffix = buildConversationListSuffix(clientId);
      const url = `/api/conversations${suffix}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to load conversations");

      const data = await response.json();
      return data.conversations || [];
    },
    enabled: canLoadConversations,
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    ...query,
    isAccessReady: canLoadConversations,
  };
}

export function useConversation(conversationId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const { clientId } = useChatContext();
  const isAnonymousReady = !user && !authLoading && clientId.length > 0;
  const canLoadConversation =
    Boolean(conversationId) && (Boolean(user) || isAnonymousReady);

  const query = useQuery({
    queryKey: getConversationQueryKey(conversationId, clientId),
    queryFn: async () => {
      if (!conversationId) return null;
      return fetchConversation(conversationId, clientId);
    },
    enabled: canLoadConversation,
    staleTime: 1000 * 60 * 5, // Keep loaded thread stable while user chats
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isAccessReady: !conversationId || canLoadConversation,
  };
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      clientId?: string;
      userLocation?: LocationPayload;
    }) => {
      // Always create in database (API handles both authenticated and anonymous)
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error("Failed to create conversation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();
  const { clientId } = useChatContext();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const params = new URLSearchParams();
      if (clientId) {
        params.append("clientId", clientId);
      }

      const suffix = params.toString() ? `?${params.toString()}` : "";

      // Always use database (API handles both authenticated and anonymous)
      const response = await fetch(
        `/api/conversations/${conversationId}${suffix}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to archive conversation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  const { clientId } = useChatContext();

  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      message: PersistedMessagePayload;
    }) => {
      const { conversationId, message } = params;
      const query = new URLSearchParams();
      if (clientId) {
        query.append("clientId", clientId);
      }
      const suffix = query.toString() ? `?${query.toString()}` : "";

      // Always use database (API handles both authenticated and anonymous)
      const response = await fetch(
        `/api/conversations/${conversationId}/messages${suffix}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );

      if (!response.ok) throw new Error("Failed to save message");
      return response.json();
    },
    onSuccess: () => {
      // Do not refetch the active thread on every saved message.
      // It causes race conditions with streaming and can duplicate UI messages.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
