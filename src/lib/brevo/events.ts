import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { brevo, isBrevoEnabled } from "./client";

/**
 * Track a behavioral event in Brevo.
 * This can trigger Automation workflows.
 * Also mirrors the result to PostHog for observability.
 */
export async function trackBrevoEvent(
  email: string,
  eventName: string,
  eventProperties?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isBrevoEnabled() || !brevo) return;

  try {
    await brevo.event.createEvent({
      event_name: eventName,
      identifiers: { email_id: email },
      event_properties: eventProperties,
    });

    captureEvent(ANALYTICS_EVENT.BREVO_EVENT_SENT, {
      brevo_event_name: eventName,
      email,
      ...eventProperties,
    });
  } catch (error) {
    console.error(
      "[Brevo] Failed to track event:",
      eventName,
      email,
      (error as Error)?.message,
    );

    captureEvent(ANALYTICS_EVENT.BREVO_EVENT_FAILED, {
      brevo_event_name: eventName,
      email,
      error_message: (error as Error)?.message || "unknown",
      ...eventProperties,
    });
  }
}
