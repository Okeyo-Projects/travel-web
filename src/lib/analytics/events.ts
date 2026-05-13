export const ANALYTICS_EVENT = {
  AUTH_MODAL_OPENED: "auth_modal_opened",
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_LOGIN_FAILED: "auth_login_failed",
  AUTH_SIGNUP_SUCCESS: "auth_signup_success",
  AUTH_LOGOUT: "auth_logout",
  HOME_AI_PROMPT_SUBMITTED: "home_ai_prompt_submitted",
  EXPERIENCE_VIEWED: "experience_viewed",
  EXPERIENCE_SEARCH: "experience_search",
  EXPERIENCE_CARD_CLICKED: "experience_card_clicked",
  CATEGORY_VIEWED: "category_viewed",
  BOOKING_STARTED: "booking_started",
  BOOKING_STEP_COMPLETED: "booking_step_completed",
  BOOKING_SUBMITTED: "booking_submitted",
  BOOKING_CANCELLED: "booking_cancelled",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
  CHAT_STARTED: "chat_started",
  CHAT_INPUT_FOCUSED: "chat_input_focused",
  CHAT_MESSAGE_SENT: "chat_message_sent",
  CHAT_BOOKING_CREATED: "chat_booking_created",
  CHAT_SUGGESTION_CLICKED: "chat_suggestion_clicked",
  CHAT_QUICK_REPLY_SELECTED: "chat_quick_reply_selected",
  CHAT_LOCATION_REQUESTED: "chat_location_requested",
  CHAT_LOCATION_GRANTED: "chat_location_granted",
  CHAT_LOCATION_DENIED: "chat_location_denied",
  DEEP_LINK_CHAT_OPENED: "deep_link_chat_opened",
  DEEP_LINK_FIRST_REPLY: "deep_link_first_reply",
  DEEP_LINK_BOOKING_COMPLETED: "deep_link_booking_completed",
  EXPERIENCE_LIKED: "experience_liked",
  EXPERIENCE_UNLIKED: "experience_unliked",
  COMMENT_ADDED: "comment_added",
  EXPERIENCE_SHARED: "experience_shared",
  HOST_MODE_ENTERED: "host_mode_entered",
  EXPERIENCE_PUBLISHED: "experience_published",
  EXPERIENCE_UNPUBLISHED: "experience_unpublished",
  AVAILABILITY_UPDATED: "availability_updated",
  PAGE_VIEWED: "$pageview",
  // Video
  VIDEO_PLAYED: "video_played",
  VIDEO_PAUSED: "video_paused",
  VIDEO_MUTED: "video_muted",
  VIDEO_UNMUTED: "video_unmuted",
  VIDEO_ERROR: "video_error",
  // Errors
  CHAT_MESSAGE_FAILED: "chat_message_failed",
  BOOKING_QUOTE_FAILED: "booking_quote_failed",
  BOOKING_SUBMIT_FAILED: "booking_submit_failed",
  AI_CHAT_COMPLETED: "ai_chat_completed",
  AI_RESPONSE_RECEIVED: "ai_response_received",
  AI_RESPONSE_FEEDBACK_SUBMITTED: "ai_response_feedback_submitted",
  AI_TOOL_USED: "ai_tool_used",
  // Performance
  WEB_VITALS: "web_vitals",
  // Brevo
  BREVO_EVENT_SENT: "brevo_event_sent",
  BREVO_EVENT_FAILED: "brevo_event_failed",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT];

export type AnalyticsEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export type AnalyticsUserProperties = {
  role?: "traveler" | "host";
  language?: string | null;
  created_at?: string | null;
};
