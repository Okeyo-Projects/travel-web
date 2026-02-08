"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserLocation {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface ChatContextType {
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation | null) => void;
  sessionId: string;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  startNewConversation: () => void;
  newConversationNonce: number;
  clientId: string;
  getLocationParams: () => { lat: number; lng: number } | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newConversationNonce, setNewConversationNonce] = useState(0);

  // Generate stable client ID for anonymous users
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("okeyo_client_id");
    if (stored) {
      setClientId(stored);
    } else {
      const newId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("okeyo_client_id", newId);
      setClientId(newId);
    }
  }, []);

  const getLocationParams = () => {
    if (!userLocation) return null;
    return {
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
  };

  const startNewConversation = () => {
    setConversationId(null);
    setNewConversationNonce((value) => value + 1);
  };

  return (
    <ChatContext.Provider
      value={{
        userLocation,
        setUserLocation,
        sessionId,
        conversationId,
        setConversationId,
        startNewConversation,
        newConversationNonce,
        clientId,
        getLocationParams,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
