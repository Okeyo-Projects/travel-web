"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

interface ExperienceAnalyticsProps {
  experienceId: string;
  type: string;
}

export function ExperienceAnalytics({ experienceId, type }: ExperienceAnalyticsProps) {
  useEffect(() => {
    captureEvent(ANALYTICS_EVENT.EXPERIENCE_VIEWED, {
      experience_id: experienceId,
      type: type,
    });
  }, [experienceId, type]);

  return null;
}
