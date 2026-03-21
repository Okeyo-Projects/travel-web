"use client";

import { useQuery } from "@tanstack/react-query";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

export type ViewMode = "traveler" | "host";

type ViewModeContextValue = {
  mode: ViewMode;
  canHost: boolean;
  loading: boolean;
  setMode: (mode: ViewMode) => void;
};

const VIEW_MODE_STORAGE_KEY = "okeyo-view-mode";
const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [mode, setModeState] = useState<ViewMode>("traveler");
  const [hasHydratedMode, setHasHydratedMode] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-host-mode", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("is_host")
        .eq("id", user!.id)
        .maybeSingle();
      return data as { is_host: boolean | null } | null;
    },
  });

  const canHost = Boolean(user && profile?.is_host);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (storedMode === "traveler" || storedMode === "host") {
      setModeState(storedMode);
    }
    setHasHydratedMode(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedMode) return;
    if (!canHost && mode === "host") {
      setModeState("traveler");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, "traveler");
      }
    }
  }, [canHost, hasHydratedMode, mode]);

  const setMode = useCallback(
    (nextMode: ViewMode) => {
      const normalizedMode =
        nextMode === "host" && !canHost ? "traveler" : nextMode;
      setModeState(normalizedMode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, normalizedMode);
      }
    },
    [canHost],
  );

  const value = useMemo<ViewModeContextValue>(
    () => ({
      mode,
      canHost,
      loading: authLoading || (Boolean(user) && profileLoading) || !hasHydratedMode,
      setMode,
    }),
    [authLoading, canHost, hasHydratedMode, mode, profileLoading, setMode, user],
  );

  return (
    <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within ViewModeProvider");
  }
  return context;
}

