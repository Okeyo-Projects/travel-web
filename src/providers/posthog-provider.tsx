"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics/posthog";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}
