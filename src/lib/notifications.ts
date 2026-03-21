import type { NotificationTarget } from "@/types/notification";

export function getNotificationTargetHref(notification: NotificationTarget): string | null {
  if (notification.action_url) {
    return notification.action_url;
  }

  const { kind, entity_id: entityId, entity_type: entityType } = notification;

  if (entityType === "booking" && entityId) {
    return `/bookings/${entityId}`;
  }

  if (entityType === "experience" && entityId) {
    return `/experience/${entityId}`;
  }

  if (entityType === "profile") {
    return "/profile";
  }

  switch (kind) {
    case "booking_request":
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_created":
    case "booking_approved":
    case "booking_declined":
    case "booking_reminder":
    case "booking_paid":
    case "payment_succeeded":
    case "payment_failed":
      return entityId ? `/bookings/${entityId}` : "/bookings";

    case "new_review":
    case "review_response":
    case "review_request":
    case "review_received":
      return entityId ? `/experience/${entityId}` : "/bookings";

    case "new_message":
      return "/chat";

    case "follow":
    case "new_follow":
      return "/profile";

    case "like":
    case "like_experience":
    case "share_experience":
    case "report_experience":
    case "comment":
    case "comment_reply":
    case "comment_experience":
    case "reply_to_comment":
    case "new_comment":
    case "experience_published":
      return entityId ? `/experience/${entityId}` : "/explore";

    case "like_reel":
    case "save_reel":
    case "report_reel":
      return "/explore";

    case "system":
    default:
      return null;
  }
}
