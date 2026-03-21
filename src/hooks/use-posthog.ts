"use client";

import { useCallback } from "react";
import {
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@/lib/analytics/events";
import { captureEvent, isFeatureFlagEnabled } from "@/lib/analytics/posthog";

export function usePostHogEvent() {
  return useCallback(
    (event: AnalyticsEventName, properties?: AnalyticsEventProperties) => {
      captureEvent(event, properties);
    },
    [],
  );
}

export function useFeatureFlag(flag: string) {
  return isFeatureFlagEnabled(flag);
}
