/**
 * Shared email utilities for edge functions
 */

/**
 * Send an email via the send-email edge function
 */
export async function sendEmail(params: {
  template: string;
  to: string;
  data: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
}): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not set');
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(params: {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  experience_title: string;
  experience_city: string;
  host_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  infants?: number;
  total_amount: string;
  currency: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'booking_confirmation',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send booking request to host
 */
export async function sendBookingRequestToHost(params: {
  booking_id: string;
  host_name: string;
  host_email: string;
  guest_name: string;
  experience_title: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: string;
  guest_notes?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'booking_request_host',
    to: params.host_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send booking cancellation email
 */
export async function sendBookingCancellation(params: {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  experience_title: string;
  cancellation_reason?: string;
  refund_amount?: string;
  cancelled_by: 'guest' | 'host' | 'system';
  user_id?: string;
}) {
  return sendEmail({
    template: 'booking_cancelled',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(params: {
  user_name: string;
  user_email: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'welcome',
    to: params.user_email,
    data: params,
    entity_type: 'user',
    entity_id: params.user_id,
    user_id: params.user_id,
  });
}

/**
 * Send review request to guest
 */
export async function sendReviewRequestEmail(params: {
  booking_id: string;
  guest_email: string;
  guest_name?: string | null;
  experience_title?: string | null;
  date_range?: string | null;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'review_request',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send review received notification to host
 */
export async function sendReviewReceivedEmail(params: {
  booking_id: string;
  host_email: string;
  host_name?: string | null;
  guest_name?: string | null;
  experience_title?: string | null;
  date_range?: string | null;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'review_received',
    to: params.host_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send booking reminder (payment or upcoming stay)
 */
export async function sendBookingReminderEmail(params: {
  booking_id: string;
  guest_email: string;
  guest_name?: string | null;
  experience_title?: string | null;
  date_range?: string | null;
  location?: string | null;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'booking_reminder',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(params: {
  booking_id: string;
  guest_email: string;
  guest_name?: string | null;
  experience_title?: string | null;
  amount?: string | number;
  currency?: string;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'payment_failed',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send payment receipt to host
 */
export async function sendPaymentReceiptHostEmail(params: {
  booking_id: string;
  host_email: string;
  host_name?: string | null;
  guest_name?: string | null;
  experience_title?: string | null;
  date_range?: string | null;
  amount?: string | number;
  currency?: string;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'payment_receipt_host',
    to: params.host_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}

/**
 * Send payment invoice to guest
 */
export async function sendPaymentInvoiceEmail(params: {
  booking_id: string;
  invoice_id?: string;
  guest_email: string;
  guest_name?: string | null;
  experience_title?: string | null;
  date_range?: string | null;
  amount?: string | number;
  currency?: string;
  action_url?: string;
  user_id?: string;
}) {
  return sendEmail({
    template: 'payment_invoice',
    to: params.guest_email,
    data: params,
    entity_type: 'booking',
    entity_id: params.booking_id,
    user_id: params.user_id,
  });
}
