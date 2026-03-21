import posthog from "posthog-js";
import { isBrowserAnalyticsAllowed } from "@/lib/analytics/browser";
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsUserProperties,
} from "@/lib/analytics/events";
import {
  captureFirebaseEvent,
  identifyFirebaseUser,
  resetFirebaseUser,
} from "@/lib/analytics/firebase";

export function isAnalyticsEnabled() {
  const hasConfig =
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const explicitlyDisabled =
    process.env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";
  const allowInDev = process.env.NEXT_PUBLIC_POSTHOG_ALLOW_DEV === "true";

  if (!hasConfig || explicitlyDisabled) return false;

  return isBrowserAnalyticsAllowed(allowInDev);
}

export function captureEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
) {
  if (isAnalyticsEnabled()) {
    posthog.capture(event, properties);
  }

  void captureFirebaseEvent(event, properties);
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: AnalyticsUserProperties,
) {
  if (isAnalyticsEnabled()) {
    posthog.identify(userId, properties);
  }

  void identifyFirebaseUser(userId, properties);
}

export function resetAnalyticsUser() {
  posthog.reset();
  void resetFirebaseUser();
}

export function isFeatureFlagEnabled(flag: string) {
  if (!isAnalyticsEnabled()) return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}
