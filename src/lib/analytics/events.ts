export const ANALYTICS_EVENT = {
  AUTH_MODAL_OPENED: "auth_modal_opened",
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_LOGIN_FAILED: "auth_login_failed",
  AUTH_SIGNUP_SUCCESS: "auth_signup_success",
  AUTH_LOGOUT: "auth_logout",
  EXPERIENCE_VIEWED: "experience_viewed",
  EXPERIENCE_SEARCH: "experience_search",
  EXPERIENCE_CARD_CLICKED: "experience_card_clicked",
  CATEGORY_VIEWED: "category_viewed",
  BOOKING_STARTED: "booking_started",
  BOOKING_STEP_COMPLETED: "booking_step_completed",
  BOOKING_SUBMITTED: "booking_submitted",
  BOOKING_CANCELLED: "booking_cancelled",
  PAYMENT_INITIATED: "payment_initiated",
  CHAT_STARTED: "chat_started",
  CHAT_MESSAGE_SENT: "chat_message_sent",
  CHAT_BOOKING_CREATED: "chat_booking_created",
  EXPERIENCE_LIKED: "experience_liked",
  EXPERIENCE_UNLIKED: "experience_unliked",
  COMMENT_ADDED: "comment_added",
  EXPERIENCE_SHARED: "experience_shared",
  HOST_MODE_ENTERED: "host_mode_entered",
  EXPERIENCE_PUBLISHED: "experience_published",
  EXPERIENCE_UNPUBLISHED: "experience_unpublished",
  AVAILABILITY_UPDATED: "availability_updated",
  PAGE_VIEWED: "$pageview",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];

export type AnalyticsEventProperties = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsUserProperties = {
  role?: "traveler" | "host";
  language?: string | null;
  created_at?: string | null;
};
