"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const disabled = process.env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";
    const isDev = process.env.NODE_ENV !== "production";
    const allowInDev = process.env.NEXT_PUBLIC_POSTHOG_ALLOW_DEV === "true";

    if (!key || !host || disabled || (isDev && !allowInDev)) return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  return <>{children}</>;
}
