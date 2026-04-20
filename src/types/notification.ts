import type { Enums, Tables } from "@/types/supabase";

export type NotificationRow = Tables<"notifications">;

export type ExtendedNotificationKind =
  | "booking_approved"
  | "booking_declined"
  | "booking_reminder"
  | "booking_paid"
  | "review_request"
  | "review_received"
  | "payment_failed"
  | "comment"
  | "comment_reply"
  | "comment_experience"
  | "reply_to_comment"
  | "new_comment"
  | "share_experience"
  | "report_experience"
  | "like_reel"
  | "save_reel"
  | "report_reel";

export type NotificationKind = Enums<"notification_kind"> | ExtendedNotificationKind;

export type NotificationTarget = Omit<
  Pick<NotificationRow, "kind" | "entity_type" | "entity_id" | "action_url" | "metadata">,
  "kind"
> & { kind: NotificationKind };
