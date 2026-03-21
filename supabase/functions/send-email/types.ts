/**
 * Type definitions for send-email edge function
 * Note: These duplicate the types in @okeyo/types but are needed
 * for Deno edge function runtime which doesn't support workspace references
 */

export type EmailTemplate =
  | 'booking_confirmation'
  | 'booking_cancelled'
  | 'booking_request_host'
  | 'booking_approved'
  | 'booking_declined'
  | 'booking_reminder'
  | 'payment_receipt'
  | 'payment_receipt_host'
  | 'payment_invoice'
  | 'payment_failed'
  | 'review_request'
  | 'review_received'
  | 'review_response'
  | 'welcome'
  | 'password_reset';

export interface SendEmailRequest {
  template: EmailTemplate;
  to: string;
  data: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
}

export interface SendEmailResponse {
  success: boolean;
  email_id?: string;
  error?: string;
}
