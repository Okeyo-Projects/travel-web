import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "./use-auth";

export interface Conversation {
  id: string;
  title: string | null;
  first_message: string | null;
  created_at: string;
  updated_at: string;
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

export function useConversations() {
  const { user } = useAuth();
  const { clientId } = useChatContext();

  return useQuery({
    queryKey: ["conversations", user?.id, clientId],
    queryFn: async () => {
      // Build query params for anonymous users
      const params = new URLSearchParams();
      if (!user && clientId) {
        params.append("clientId", clientId);
      }

      const url = `/api/conversations${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to load conversations");

      const data = await response.json();
      return data.conversations || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useConversation(conversationId: string | null) {
  const { clientId } = useChatContext();

  return useQuery({
    queryKey: ["conversation", conversationId, clientId],
    queryFn: async () => {
      if (!conversationId) return null;

      const params = new URLSearchParams();
      if (clientId) {
        params.append("clientId", clientId);
      }

      const suffix = params.toString() ? `?${params.toString()}` : "";

      // Always fetch from database (API handles both authenticated and anonymous)
      const response = await fetch(
        `/api/conversations/${conversationId}${suffix}`,
      );

      if (!response.ok) throw new Error("Failed to load conversation");

      const data = await response.json();
      return {
        conversation: data.conversation,
        messages: data.messages || [],
      };
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // Keep loaded thread stable while user chats
    refetchOnWindowFocus: false,
  });
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
