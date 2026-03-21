import type { Database } from "@/types/supabase";

export const SUPPORT_EMAIL = "support@okeyotravel.com";
export const SUPPORT_PHONE_NUMBER = "+212625555493";
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE_NUMBER.replace(/\D/g, "")}`;

export type SupportFaqCategory =
  | "general"
  | "booking"
  | "payments"
  | "account"
  | "host";

export type SupportFaqFilter = SupportFaqCategory | "all";

export type SupportIssueType = Extract<
  Database["public"]["Enums"]["issue_type"],
  "bug" | "feature_request" | "payment_issue" | "account_issue" | "other"
>;

export type SupportTicketInsert =
  Database["public"]["Tables"]["support_tickets"]["Insert"];

export type SupportIssueFormValues = {
  subject: string;
  type: SupportIssueType;
  description: string;
  contactEmail: string;
};

export type SupportSubmissionResult = {
  id: string;
  reference: string;
};

export type SupportIssueOption = {
  value: SupportIssueType;
};

export type SupportFaqItem = {
  id: string;
  category: SupportFaqCategory;
};

export const SUPPORT_CATEGORY_OPTIONS: ReadonlyArray<{
  value: SupportFaqFilter;
}> = [
  { value: "all" },
  { value: "general" },
  { value: "booking" },
  { value: "payments" },
  { value: "account" },
  { value: "host" },
];

export const SUPPORT_ISSUE_OPTIONS: ReadonlyArray<SupportIssueOption> = [
  { value: "bug" },
  { value: "feature_request" },
  { value: "payment_issue" },
  { value: "account_issue" },
  { value: "other" },
];

export const SUPPORT_FAQ_ITEMS: ReadonlyArray<SupportFaqItem> = [
  { id: "general-response-times", category: "general" },
  { id: "general-contact-options", category: "general" },
  { id: "booking-modify", category: "booking" },
  { id: "booking-cancel", category: "booking" },
  { id: "payments-charge", category: "payments" },
  { id: "payments-refund-time", category: "payments" },
  { id: "account-login", category: "account" },
  { id: "account-profile", category: "account" },
  { id: "host-visibility", category: "host" },
  { id: "host-booking-issues", category: "host" },
];
