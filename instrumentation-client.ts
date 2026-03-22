import posthog from "posthog-js";
import { isBrowserAnalyticsAllowed } from "@/lib/analytics/browser";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const hasConfig =
  Boolean(posthogKey) && Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);
const isDisabled = process.env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";
const allowInDev = process.env.NEXT_PUBLIC_POSTHOG_ALLOW_DEV === "true";
const isDebugEnabled = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";
const shouldInitialize =
  hasConfig && !isDisabled && isBrowserAnalyticsAllowed(allowInDev);

if (posthogKey && shouldInitialize && !posthog.__loaded) {
  posthog.init(posthogKey, {
    api_host: "/internal/collect",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    capture_pageview: false,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    debug: isDebugEnabled,
  });
}
