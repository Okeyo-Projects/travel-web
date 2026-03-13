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
  label: string;
  description: string;
};

export type SupportFaqItem = {
  id: string;
  category: SupportFaqCategory;
  question: string;
  answer: string;
  keywords: string[];
};

export const SUPPORT_CATEGORY_OPTIONS: ReadonlyArray<{
  value: SupportFaqFilter;
  label: string;
}> = [
  { value: "all", label: "All topics" },
  { value: "general", label: "General" },
  { value: "booking", label: "Booking" },
  { value: "payments", label: "Payments" },
  { value: "account", label: "Account" },
  { value: "host", label: "Host" },
];

export const SUPPORT_ISSUE_OPTIONS: ReadonlyArray<SupportIssueOption> = [
  {
    value: "bug",
    label: "Bug",
    description: "Something is broken or behaving unexpectedly.",
  },
  {
    value: "feature_request",
    label: "Feature request",
    description: "Suggest an improvement or a missing capability.",
  },
  {
    value: "payment_issue",
    label: "Payment issue",
    description: "Charges, refunds, invoices, or payout questions.",
  },
  {
    value: "account_issue",
    label: "Account issue",
    description: "Login, profile, verification, or access problems.",
  },
  {
    value: "other",
    label: "Other",
    description: "Anything that does not fit the categories above.",
  },
];

export const SUPPORT_FAQ_ITEMS: ReadonlyArray<SupportFaqItem> = [
  {
    id: "general-response-times",
    category: "general",
    question: "How quickly does the support team reply?",
    answer:
      "We usually reply within **24 hours** on business days.\n\n- Urgent booking and payment issues are prioritized first.\n- Include screenshots, dates, and booking references to speed things up.",
    keywords: ["reply", "response", "time", "urgent", "support"],
  },
  {
    id: "general-contact-options",
    category: "general",
    question: "What is the fastest way to contact Okeyo Travel?",
    answer:
      "For routine questions, email support is the best starting point.\n\n- Email us at `support@okeyotravel.com`.\n- Use WhatsApp or phone for urgent, time-sensitive travel issues.",
    keywords: ["contact", "email", "whatsapp", "phone"],
  },
  {
    id: "booking-modify",
    category: "booking",
    question: "Can I change a booking after it has been confirmed?",
    answer:
      "Booking changes depend on the host's availability and cancellation rules.\n\n1. Open your booking details page.\n2. Review the experience policy.\n3. Contact support if the change cannot be handled directly.",
    keywords: ["change", "modify", "booking", "confirmed"],
  },
  {
    id: "booking-cancel",
    category: "booking",
    question: "How do cancellations and refunds work?",
    answer:
      "Refunds follow the cancellation policy attached to the booking.\n\n- Flexible experiences usually refund more when cancelled early.\n- Some fees may be non-refundable after the free-cancellation window closes.",
    keywords: ["cancel", "refund", "policy", "booking"],
  },
  {
    id: "payments-charge",
    category: "payments",
    question:
      "I was charged but did not receive a confirmation. What should I do?",
    answer:
      "Start by checking your bookings page and inbox for a pending confirmation.\n\nIf nothing appears within a few minutes, send us:\n- the payment date\n- the amount charged\n- the last 4 digits of the card",
    keywords: ["charged", "confirmation", "card", "payment"],
  },
  {
    id: "payments-refund-time",
    category: "payments",
    question: "How long do refunds take to appear?",
    answer:
      "Most refunds appear within **5 to 10 business days**, depending on your bank.\n\nSome banks display the reversal faster, while others keep the transaction pending longer.",
    keywords: ["refund", "bank", "days", "payment"],
  },
  {
    id: "account-login",
    category: "account",
    question: "I cannot log in to my account. What can I do?",
    answer:
      "Try the basics first:\n\n- confirm you are using the same email you signed up with\n- retry after clearing cached auth state\n- use the correct sign-in provider if you registered with Google or Apple",
    keywords: ["login", "sign in", "password", "google", "apple"],
  },
  {
    id: "account-profile",
    category: "account",
    question: "Can I update my profile details and language preferences?",
    answer:
      "Yes. Visit **Settings** to update your preferred language, then open **Profile** for personal details like your display name and bio.",
    keywords: ["profile", "language", "settings", "account"],
  },
  {
    id: "host-visibility",
    category: "host",
    question: "Why is my experience not visible to travelers?",
    answer:
      "Experiences can be hidden when they are still in review, saved as draft, or manually unpublished.\n\nCheck the host visibility page to confirm the listing status before contacting support.",
    keywords: ["host", "experience", "published", "draft", "review"],
  },
  {
    id: "host-booking-issues",
    category: "host",
    question: "What should hosts include when reporting an issue?",
    answer:
      "Include the experience name, the affected booking or departure date, and any screenshots.\n\nThe more specific the report, the faster we can reproduce and resolve it.",
    keywords: ["host", "report", "screenshots", "booking"],
  },
];
