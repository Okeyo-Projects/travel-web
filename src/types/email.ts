import { z } from 'zod';

// =====================================================
// EMAIL TYPES AND SCHEMAS
// =====================================================

// Email template identifiers
export const EmailTemplate = z.enum([
  'booking_confirmation',
  'booking_cancelled',
  'booking_request_host',
  'booking_approved',
  'booking_declined',
  'payment_receipt',
  'review_request',
  'review_response',
  'welcome',
  'booking_reminder',
  'password_reset',
]);

export type EmailTemplate = z.infer<typeof EmailTemplate>;

// Resend email status
export const ResendStatus = z.enum([
  'queued',
  'sent',
  'delivered',
  'delivery_delayed',
  'bounced',
  'complained',
  'clicked',
  'opened',
]);

export type ResendStatus = z.infer<typeof ResendStatus>;

// Base email request
export const SendEmailRequest = z.object({
  template: EmailTemplate,
  to: z.string().email(),
  data: z.record(z.unknown()),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequest>;

// Email response
export const SendEmailResponse = z.object({
  success: z.boolean(),
  email_id: z.string().optional(),
  error: z.string().optional(),
});

export type SendEmailResponse = z.infer<typeof SendEmailResponse>;

// =====================================================
// TEMPLATE DATA SCHEMAS
// =====================================================

// Booking confirmation email data
export const BookingConfirmationData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  experience_city: z.string(),
  host_name: z.string(),
  booking_id: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  adults: z.number(),
  children: z.number().optional(),
  infants: z.number().optional(),
  total_amount: z.string(),
  currency: z.string(),
  booking_url: z.string().url().optional(),
});

export type BookingConfirmationData = z.infer<typeof BookingConfirmationData>;

// Booking cancelled email data
export const BookingCancelledData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  booking_id: z.string(),
  cancellation_reason: z.string().optional(),
  refund_amount: z.string().optional(),
  cancelled_by: z.enum(['guest', 'host', 'system']),
});

export type BookingCancelledData = z.infer<typeof BookingCancelledData>;

// Booking request to host email data
export const BookingRequestHostData = z.object({
  host_name: z.string(),
  host_email: z.string().email(),
  guest_name: z.string(),
  experience_title: z.string(),
  booking_id: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  guests_count: z.number(),
  total_amount: z.string(),
  guest_notes: z.string().optional(),
  approve_url: z.string().url().optional(),
  decline_url: z.string().url().optional(),
});

export type BookingRequestHostData = z.infer<typeof BookingRequestHostData>;

// Booking approved email data
export const BookingApprovedData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  booking_id: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  total_amount: z.string(),
  payment_deadline: z.string(),
  payment_url: z.string().url().optional(),
  host_notes: z.string().optional(),
});

export type BookingApprovedData = z.infer<typeof BookingApprovedData>;

// Booking declined email data
export const BookingDeclinedData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  booking_id: z.string(),
  decline_reason: z.string().optional(),
  host_notes: z.string().optional(),
});

export type BookingDeclinedData = z.infer<typeof BookingDeclinedData>;

// Payment receipt email data
export const PaymentReceiptData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  booking_id: z.string(),
  payment_date: z.string(),
  amount_paid: z.string(),
  currency: z.string(),
  payment_method: z.string().optional(),
  receipt_url: z.string().url().optional(),
  invoice_number: z.string().optional(),
});

export type PaymentReceiptData = z.infer<typeof PaymentReceiptData>;

// Review request email data
export const ReviewRequestData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  experience_city: z.string(),
  host_name: z.string(),
  booking_id: z.string(),
  check_out: z.string(),
  review_url: z.string().url().optional(),
});

export type ReviewRequestData = z.infer<typeof ReviewRequestData>;

// Review response email data
export const ReviewResponseData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  host_name: z.string(),
  host_response: z.string(),
  original_review: z.string(),
  review_url: z.string().url().optional(),
});

export type ReviewResponseData = z.infer<typeof ReviewResponseData>;

// Welcome email data
export const WelcomeEmailData = z.object({
  user_name: z.string(),
  user_email: z.string().email(),
  explore_url: z.string().url().optional(),
  profile_url: z.string().url().optional(),
});

export type WelcomeEmailData = z.infer<typeof WelcomeEmailData>;

// Booking reminder email data
export const BookingReminderData = z.object({
  guest_name: z.string(),
  guest_email: z.string().email(),
  experience_title: z.string(),
  booking_id: z.string(),
  check_in: z.string(),
  check_in_time: z.string().optional(),
  host_name: z.string(),
  host_contact: z.string().optional(),
  booking_url: z.string().url().optional(),
});

export type BookingReminderData = z.infer<typeof BookingReminderData>;

// Password reset email data
export const PasswordResetData = z.object({
  user_name: z.string(),
  user_email: z.string().email(),
  reset_url: z.string().url(),
  expires_at: z.string(),
});

export type PasswordResetData = z.infer<typeof PasswordResetData>;

// Email log type (matches database table)
export interface EmailLog {
  id: string;
  template_id: EmailTemplate;
  recipient_email: string;
  recipient_user_id: string | null;
  resend_email_id: string | null;
  resend_status: ResendStatus | null;
  subject: string | null;
  template_data: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  error: string | null;
  retry_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
