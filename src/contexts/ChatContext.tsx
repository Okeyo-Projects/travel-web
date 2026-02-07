'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface UserLocation {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface ChatContextType {
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation | null) => void;
  sessionId: string;
  getLocationParams: () => { lat: number; lng: number } | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const getLocationParams = () => {
    if (!userLocation) return null;
    return {
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
  };

  return (
    <ChatContext.Provider
      value={{
        userLocation,
        setUserLocation,
        sessionId,
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
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
