import type { EmailTemplate } from './types.ts';

/**
 * Map email template IDs to Resend dashboard template IDs
 * These IDs need to be created in your Resend dashboard
 */
export function getResendTemplateId(template: EmailTemplate): string {
  const templateMapping: Record<EmailTemplate, string> = {
    booking_confirmation: 'booking-confirmation-v1',
    booking_cancelled: 'booking-cancelled-v1',
    booking_request_host: 'booking-request-host-v1',
    booking_approved: 'booking-approved-v1',
    booking_declined: 'booking-declined-v1',
    booking_reminder: 'booking-reminder-v1',
    payment_receipt: 'payment-receipt-v1',
    payment_receipt_host: 'payment-receipt-host-v1',
    payment_invoice: 'payment-invoice-v1',
    payment_failed: 'payment-failed-v1',
    review_request: 'review-request-v1',
    review_received: 'review-received-v1',
    review_response: 'review-response-v1',
    welcome: 'welcome-v1',
    password_reset: 'password-reset-v1',
  };

  return templateMapping[template];
}

/**
 * Email subject translations
 * These match the keys in packages/i18n/src/translations/en.json
 * TODO: Import from @okeyo/i18n package when available for server-side use
 */
const EMAIL_SUBJECTS = {
  en: {
    booking_confirmation: (d: Record<string, unknown>) =>
      `Booking Confirmed - ${d.experience_title}`,
    booking_cancelled: (d: Record<string, unknown>) =>
      `Booking Cancelled - ${d.experience_title}`,
    booking_request_host: (d: Record<string, unknown>) =>
      `New Booking Request - ${d.experience_title}`,
    booking_approved: (d: Record<string, unknown>) =>
      `Booking Approved - ${d.experience_title}`,
    booking_declined: (d: Record<string, unknown>) =>
      `Booking Update - ${d.experience_title}`,
    payment_receipt: (d: Record<string, unknown>) =>
      `Payment Receipt - ${d.experience_title}`,
    payment_receipt_host: (d: Record<string, unknown>) =>
      `Guest Payment Received - ${d.experience_title}`,
    payment_invoice: (d: Record<string, unknown>) =>
      `Invoice - ${d.experience_title}`,
    payment_failed: (d: Record<string, unknown>) =>
      `Payment Issue - ${d.experience_title}`,
    review_request: (d: Record<string, unknown>) =>
      `How was your experience at ${d.experience_title}?`,
    review_received: (d: Record<string, unknown>) =>
      `New Review for ${d.experience_title}`,
    review_response: (d: Record<string, unknown>) =>
      `${d.host_name} responded to your review`,
    welcome: 'Welcome to Okeyo Experience!',
    booking_reminder: (d: Record<string, unknown>) =>
      `Reminder: Your experience at ${d.experience_title} is coming up!`,
    password_reset: 'Reset your Okeyo password',
  },
};

/**
 * Generate email subject based on template and data
 * @param template - Email template type
 * @param data - Template data with variables
 * @param language - User's preferred language (defaults to 'en')
 */
export function getEmailSubject(
  template: EmailTemplate,
  data: Record<string, unknown>,
  language: 'en' | 'fr' | 'ar' = 'en'
): string {
  const translations = EMAIL_SUBJECTS[language] || EMAIL_SUBJECTS.en;
  const subjectTemplate = translations[template];

  if (typeof subjectTemplate === 'function') {
    return subjectTemplate(data);
  }

  return subjectTemplate;
}
