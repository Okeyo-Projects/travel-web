import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

export function trackHostModeEntered(source: string = "navbar") {
  captureEvent(ANALYTICS_EVENT.HOST_MODE_ENTERED, { source });
}

export function trackExperiencePublished(experienceId: string) {
  captureEvent(ANALYTICS_EVENT.EXPERIENCE_PUBLISHED, {
    experience_id: experienceId,
  });
}

export function trackExperienceUnpublished(experienceId: string) {
  captureEvent(ANALYTICS_EVENT.EXPERIENCE_UNPUBLISHED, {
    experience_id: experienceId,
  });
}

export function trackAvailabilityUpdated(experienceId: string) {
  captureEvent(ANALYTICS_EVENT.AVAILABILITY_UPDATED, {
    experience_id: experienceId,
  });
}
