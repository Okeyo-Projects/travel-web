import {
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsUserProperties,
} from "@/lib/analytics/events";

declare global {
  interface Window {
    posthog?: {
      init: (
        token: string,
        config: Record<string, unknown>,
        name?: string,
      ) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset: () => void;
      isFeatureEnabled?: (flag: string) => boolean;
    };
    __okeyoPosthogInitialized?: boolean;
  }
}

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
    .find((entry) =>
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

function ensurePosthogStub() {
  if (typeof window === "undefined" || window.posthog) return;

  const posthogStub: any[] & {
    init?: (...args: unknown[]) => void;
    capture?: (...args: unknown[]) => void;
    identify?: (...args: unknown[]) => void;
    reset?: (...args: unknown[]) => void;
    people?: { set?: (...args: unknown[]) => void };
    __SV?: number;
    _i?: unknown[];
  } = [];

  posthogStub._i = [];
  posthogStub.__SV = 1;

  const methods = ["capture", "identify", "reset"];

  for (const method of methods) {
    (posthogStub as any)[method] = (...args: unknown[]) => {
      posthogStub.push([method, ...args]);
    };
  }

  posthogStub.init = (token: string, config: Record<string, unknown>) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `${(config.api_host as string) ?? "https://us.i.posthog.com"}/static/array.js`;

    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag?.parentNode?.insertBefore(script, firstScriptTag);

    posthogStub.push(["init", token, config]);
  };

  window.posthog = posthogStub as any;
}

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (window.__okeyoPosthogInitialized) return;
  if (!isAnalyticsEnabled()) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !apiHost) return;

  ensurePosthogStub();

  window.posthog?.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    autocapture: false,
    persistence: "localStorage+cookie",
  });

  window.__okeyoPosthogInitialized = true;
}

export function captureEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
) {
  if (!isAnalyticsEnabled()) return;
  window.posthog?.capture(event, properties);
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: AnalyticsUserProperties,
) {
  if (!isAnalyticsEnabled()) return;
  window.posthog?.identify(userId, properties);
}

export function resetAnalyticsUser() {
  window.posthog?.reset();
}

export function isFeatureFlagEnabled(flag: string) {
  if (!isAnalyticsEnabled()) return false;
  return window.posthog?.isFeatureEnabled?.(flag) ?? false;
}
