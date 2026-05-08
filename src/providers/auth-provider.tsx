"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import {
  captureEvent,
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from "@/lib/analytics/posthog";
import { createClient } from "@/lib/supabase/client";

export type AuthMode = "login" | "signup" | "forgot-password";

type AuthModalOptions = {
  mode?: AuthMode;
  onAuthed?: () => void | Promise<void>;
};

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  authMode: AuthMode;
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: AuthMode) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SUPPORTED_LANGUAGES = new Set(["fr", "ar", "en"]);

type ProfileSnapshot = {
  is_host: boolean | null;
  preferred_language: string | null;
  created_at: string | null;
};

function getFallbackDisplayName(user: User) {
  const candidates = [
    user.user_metadata?.display_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix && emailPrefix.length > 0 ? emailPrefix : "Explorer";
}

function getFallbackPreferredLanguage(user: User) {
  const profileLanguage = user.user_metadata?.preferred_language;

  if (
    typeof profileLanguage === "string" &&
    SUPPORTED_LANGUAGES.has(profileLanguage)
  ) {
    return profileLanguage;
  }

  if (typeof document !== "undefined") {
    const documentLanguage = document.documentElement.lang
      ?.toLowerCase()
      .split("-")[0];
    if (documentLanguage && SUPPORTED_LANGUAGES.has(documentLanguage)) {
      return documentLanguage;
    }
  }

  return "fr";
}

function getFallbackPhone(user: User) {
  const candidate = user.user_metadata?.phone;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function normalizeProfileSnapshot(
  profile: {
    is_host: boolean | null;
    preferred_language: string | null;
    created_at: string;
  } | null,
): ProfileSnapshot | null {
  if (!profile) return null;

  return {
    is_host: profile.is_host ?? null,
    preferred_language: profile.preferred_language ?? null,
    created_at: profile.created_at ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthModeState] = useState<AuthMode>("login");
  const pendingActionRef = useRef<AuthModalOptions["onAuthed"] | null>(null);

  const identifyUser = useCallback(
    async (nextSession: Session) => {
      const user = nextSession.user;
      const { data: fetchedProfile } = await supabase
        .from("profiles")
        .select("is_host, preferred_language, created_at")
        .eq("id", user.id)
        .maybeSingle();
      let profile = normalizeProfileSnapshot(fetchedProfile);

      if (!profile) {
        const fallbackPhone = getFallbackPhone(user);
        const { data: createdProfile, error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              display_name: getFallbackDisplayName(user),
              ...(fallbackPhone
                ? { phone: fallbackPhone, phone_verified: false }
                : {}),
              preferred_language: getFallbackPreferredLanguage(user),
              currency: "MAD",
              metadata: {
                onboarding_complete: false,
              },
            },
            { onConflict: "id" },
          )
          .select("is_host, preferred_language, created_at")
          .maybeSingle();

        if (error) {
          console.error("Failed to ensure user profile", error);
        } else {
          profile = normalizeProfileSnapshot(createdProfile);
        }
      }

      identifyAnalyticsUser(user.id, {
        role: profile?.is_host ? "host" : "traveler",
        language:
          profile?.preferred_language ??
          user.user_metadata?.preferred_language ??
          null,
        created_at: profile?.created_at ?? user.created_at ?? null,
      });
    },
    [supabase],
  );

  useEffect(() => {
    let isActive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isActive) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          void identifyUser(data.session);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);

      if (nextSession?.user) {
        void identifyUser(nextSession);
      } else {
        resetAnalyticsUser();
      }

      if (nextSession) {
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          Promise.resolve(action()).catch((error) => {
            console.error("Auth pending action failed", error);
          });
        }

        setAuthModalOpen(false);
      }
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, [identifyUser, supabase]);

  const setAuthMode = useCallback((mode: AuthMode) => {
    setAuthModeState(mode);
  }, []);

  const openAuthModal = useCallback(
    (options?: AuthModalOptions) => {
      if (options?.onAuthed) {
        pendingActionRef.current = options.onAuthed;
      }
      if (options?.mode) {
        setAuthModeState(options.mode);
      }
      captureEvent(ANALYTICS_EVENT.AUTH_MODAL_OPENED, {
        mode: options?.mode ?? authMode,
      });
      setAuthModalOpen(true);
    },
    [authMode],
  );

  const closeAuthModal = useCallback(() => {
    pendingActionRef.current = null;
    setAuthModalOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    captureEvent(ANALYTICS_EVENT.AUTH_LOGOUT);
    await supabase.auth.signOut();
    resetAnalyticsUser();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      loading,
      authModalOpen,
      authMode,
      openAuthModal,
      closeAuthModal,
      setAuthMode,
      signOut,
    }),
    [
      supabase,
      session,
      loading,
      authModalOpen,
      authMode,
      openAuthModal,
      closeAuthModal,
      setAuthMode,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
