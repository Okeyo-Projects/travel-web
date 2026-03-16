import posthog from "posthog-js";
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsUserProperties,
} from "@/lib/analytics/events";

function isDoNotTrackEnabled() {
  if (typeof navigator === "undefined") return false;

  const dnt = navigator.doNotTrack;
  return dnt === "1" || dnt === "yes";
}

function readConsentValue() {
  if (typeof window === "undefined") return null;

  const localKeys = [
    "okeyo_cookie_consent",
    "cookie_consent",
    "tracking_consent",
    "analytics_consent",
  ];

  for (const key of localKeys) {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return raw.toLowerCase();
  }

  const cookieValue = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find(
      (entry) =>
        entry.startsWith("okeyo_cookie_consent=") ||
        entry.startsWith("tracking_consent=") ||
        entry.startsWith("analytics_consent="),
    );

  if (!cookieValue) return null;
  return cookieValue.split("=")[1]?.toLowerCase() ?? null;
}

function hasTrackingConsent() {
  const consent = readConsentValue();

  if (consent === null) {
    return true;
  }

  return ![
    "false",
    "declined",
    "denied",
    "reject",
    "rejected",
    "no",
    "0",
  ].includes(consent);
}

export function isAnalyticsEnabled() {
  const hasConfig =
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const explicitlyDisabled =
    process.env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";
  const allowInDev = process.env.NEXT_PUBLIC_POSTHOG_ALLOW_DEV === "true";
  const isDev = process.env.NODE_ENV !== "production";

  if (!hasConfig || explicitlyDisabled) return false;
  if (isDev && !allowInDev) return false;
  if (isDoNotTrackEnabled()) return false;
  if (!hasTrackingConsent()) return false;

  return true;
}

export function captureEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
) {
  if (!isAnalyticsEnabled()) return;
  posthog.capture(event, properties);
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: AnalyticsUserProperties,
) {
  if (!isAnalyticsEnabled()) return;
  posthog.identify(userId, properties);
}

export function resetAnalyticsUser() {
  posthog.reset();
}

export function isFeatureFlagEnabled(flag: string) {
  if (!isAnalyticsEnabled()) return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}
