/**
 * Shared Brevo transactional email utilities for edge functions.
 * All functions are fail-safe: errors are logged but never thrown to the caller.
 */

// ─── Template ID Mapping ───
// Maps logical template names to Brevo template IDs per language.
// Brevo template IDs created 2026-05-19:
// FR: 67 (host request), 68 (accepted), 69 (rejected), 70 (payment)
// EN: 71 (host request), 72 (accepted), 73 (rejected), 74 (payment)
// AR: 75 (host request), 76 (accepted), 77 (rejected), 78 (payment)

const BREVO_TEMPLATE_IDS = {
  hostNewRequest: { fr: 67, en: 71, ar: 75 },
  userAccepted:   { fr: 68, en: 72, ar: 76 },
  userRejected:   { fr: 69, en: 73, ar: 77 },
  paymentReceipt: { fr: 70, en: 74, ar: 78 },
} as const;

export type BrevoTemplateName = keyof typeof BREVO_TEMPLATE_IDS;
export type SupportedLang = 'fr' | 'en' | 'ar';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FALLBACK_LANG: SupportedLang = 'fr';

// ─── Helpers ───

function normalizeLanguage(lang: string | null | undefined): SupportedLang {
  if (!lang) return FALLBACK_LANG;
  const normalized = lang.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'en' || normalized === 'ar') {
    return normalized;
  }
  return FALLBACK_LANG;
}

function getBrevoApiKey(): string | null {
  try {
    const key = Deno.env.get('BREVO_API_KEY');
    if (!key) {
      console.warn('[BrevoEmail] BREVO_API_KEY is not set. Emails will be skipped.');
    }
    return key || null;
  } catch (e) {
    console.error('[BrevoEmail] Error reading BREVO_API_KEY:', (e as Error).message);
    return null;
  }
}

function getTemplateId(
  templateName: BrevoTemplateName,
  lang: SupportedLang,
): number | null {
  try {
    const ids = BREVO_TEMPLATE_IDS[templateName];
    if (!ids) {
      console.error('[BrevoEmail] Unknown template name:', templateName);
      return null;
    }
    return ids[lang] ?? ids[FALLBACK_LANG] ?? null;
  } catch (e) {
    console.error('[BrevoEmail] Error resolving template ID:', (e as Error).message);
    return null;
  }
}

// ─── Core Send Function ───

interface SendBrevoEmailParams {
  toEmail: string;
  toName?: string | null;
  templateName: BrevoTemplateName;
  lang?: string | null;
  params?: Record<string, string | number | boolean | null | undefined>;
  tags?: string[];
}

interface SendBrevoEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a transactional email via Brevo.
 * This function is fail-safe: it catches ALL errors and returns a result object.
 * Callers should check `result.success` but never need to try/catch.
 */
export async function sendBrevoEmail(
  params: SendBrevoEmailParams,
): Promise<SendBrevoEmailResult> {
  const { toEmail, toName, templateName, lang, params: templateParams, tags } = params;

  // ── Validate inputs ──
  try {
    if (!toEmail || typeof toEmail !== 'string') {
      return { success: false, error: 'Missing or invalid recipient email' };
    }
    if (!toEmail.includes('@')) {
      return { success: false, error: `Invalid email format: ${toEmail}` };
    }
  } catch (e) {
    return { success: false, error: `Email validation error: ${(e as Error).message}` };
  }

  // ── Check API key ──
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  // ── Resolve template ID ──
  const normalizedLang = normalizeLanguage(lang);
  const templateId = getTemplateId(templateName, normalizedLang);
  if (!templateId) {
    return { success: false, error: `Could not resolve template ID for ${templateName}/${normalizedLang}` };
  }

  // ── Build request body ──
  let requestBody: Record<string, unknown>;
  try {
    const to = [{ email: toEmail }];
    if (toName) {
      (to[0] as Record<string, string>).name = toName;
    }

    // Clean params: remove null/undefined values and convert to strings
    const cleanParams: Record<string, string> = {};
    if (templateParams) {
      for (const [key, value] of Object.entries(templateParams)) {
        if (value !== null && value !== undefined) {
          cleanParams[key] = String(value);
        }
      }
    }

    requestBody = {
      to,
      templateId,
      params: cleanParams,
    };

    if (tags && tags.length > 0) {
      requestBody.tags = tags;
    }
  } catch (e) {
    console.error('[BrevoEmail] Error building request body:', (e as Error).message);
    return { success: false, error: `Request body build error: ${(e as Error).message}` };
  }

  // ── Send to Brevo ──
  try {
    console.log('[BrevoEmail] Sending email:', {
      to: toEmail,
      template: templateName,
      templateId,
      lang: normalizedLang,
    });

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let responseData: Record<string, unknown> | null = null;
    try {
      const text = await response.text();
      if (text) {
        responseData = JSON.parse(text) as Record<string, unknown>;
      }
    } catch {
      // Non-JSON response — log but continue
      console.warn('[BrevoEmail] Non-JSON response from Brevo:', response.status);
    }

    if (!response.ok) {
      const errorMessage = (responseData?.message as string)
        || (responseData?.code as string)
        || `HTTP ${response.status}`;
      console.error('[BrevoEmail] Brevo API error:', {
        status: response.status,
        message: errorMessage,
        to: toEmail,
        templateId,
      });
      return { success: false, error: `Brevo API error: ${errorMessage}` };
    }

    const messageId = (responseData?.messageId as string) || undefined;
    console.log('[BrevoEmail] Email sent successfully:', {
      to: toEmail,
      templateId,
      messageId,
    });

    return { success: true, messageId };
  } catch (e) {
    console.error('[BrevoEmail] Network or unexpected error:', {
      error: (e as Error).message,
      to: toEmail,
      templateId,
    });
    return { success: false, error: `Send error: ${(e as Error).message}` };
  }
}

// ─── Convenience Helpers ───

interface NotifyHostOfBookingParams {
  hostEmail: string;
  hostName?: string | null;
  hostLang?: string | null;
  guestName?: string | null;
  experienceName?: string | null;
  bookingDate?: string | null;
  guestsCount?: number | null;
  totalPrice?: string | null;
  dashboardUrl?: string | null;
}

/**
 * Notify host that a new booking request has been received.
 * Fail-safe: logs errors, never throws.
 */
export async function notifyHostOfBooking(
  params: NotifyHostOfBookingParams,
): Promise<SendBrevoEmailResult> {
  try {
    return await sendBrevoEmail({
      toEmail: params.hostEmail,
      toName: params.hostName,
      templateName: 'hostNewRequest',
      lang: params.hostLang,
      params: {
        HOST_NAME: params.hostName || 'Host',
        GUEST_NAME: params.guestName || 'A guest',
        EXPERIENCE_NAME: params.experienceName || 'Your experience',
        BOOKING_DATE: params.bookingDate || '',
        GUESTS_COUNT: params.guestsCount ?? '',
        TOTAL_PRICE: params.totalPrice ?? '',
        DASHBOARD_URL: params.dashboardUrl || 'https://okeyo.ma/host',
      },
      tags: ['booking', 'host-notification'],
    });
  } catch (e) {
    console.error('[BrevoEmail] notifyHostOfBooking unexpected error:', (e as Error).message);
    return { success: false, error: `Unexpected error: ${(e as Error).message}` };
  }
}

interface NotifyGuestBookingAcceptedParams {
  guestEmail: string;
  guestName?: string | null;
  guestLang?: string | null;
  experienceName?: string | null;
  hostName?: string | null;
  bookingDate?: string | null;
  bookingTime?: string | null;
  guestsCount?: number | null;
  meetingPoint?: string | null;
  paymentUrl?: string | null;
}

/**
 * Notify guest that their booking has been accepted.
 * Fail-safe: logs errors, never throws.
 */
export async function notifyGuestBookingAccepted(
  params: NotifyGuestBookingAcceptedParams,
): Promise<SendBrevoEmailResult> {
  try {
    return await sendBrevoEmail({
      toEmail: params.guestEmail,
      toName: params.guestName,
      templateName: 'userAccepted',
      lang: params.guestLang,
      params: {
        GUEST_NAME: params.guestName || 'Traveler',
        EXPERIENCE_NAME: params.experienceName || '',
        HOST_NAME: params.hostName || '',
        BOOKING_DATE: params.bookingDate || '',
        BOOKING_TIME: params.bookingTime || '',
        GUESTS_COUNT: params.guestsCount ?? '',
        MEETING_POINT: params.meetingPoint || '',
        PAYMENT_URL: params.paymentUrl || 'https://okeyo.ma/bookings',
      },
      tags: ['booking', 'accepted'],
    });
  } catch (e) {
    console.error('[BrevoEmail] notifyGuestBookingAccepted unexpected error:', (e as Error).message);
    return { success: false, error: `Unexpected error: ${(e as Error).message}` };
  }
}

interface NotifyGuestBookingRejectedParams {
  guestEmail: string;
  guestName?: string | null;
  guestLang?: string | null;
  experienceName?: string | null;
  bookingDate?: string | null;
  rejectionReason?: string | null;
  searchUrl?: string | null;
  aiUrl?: string | null;
}

/**
 * Notify guest that their booking has been rejected.
 * Fail-safe: logs errors, never throws.
 */
export async function notifyGuestBookingRejected(
  params: NotifyGuestBookingRejectedParams,
): Promise<SendBrevoEmailResult> {
  try {
    return await sendBrevoEmail({
      toEmail: params.guestEmail,
      toName: params.guestName,
      templateName: 'userRejected',
      lang: params.guestLang,
      params: {
        GUEST_NAME: params.guestName || 'Traveler',
        EXPERIENCE_NAME: params.experienceName || '',
        BOOKING_DATE: params.bookingDate || '',
        REJECTION_REASON: params.rejectionReason || 'Host unavailable',
        SEARCH_URL: params.searchUrl || 'https://okeyo.ma/experiences',
        AI_URL: params.aiUrl || 'https://okeyo.ma/ai-concierge',
      },
      tags: ['booking', 'rejected'],
    });
  } catch (e) {
    console.error('[BrevoEmail] notifyGuestBookingRejected unexpected error:', (e as Error).message);
    return { success: false, error: `Unexpected error: ${(e as Error).message}` };
  }
}

interface SendPaymentReceiptParams {
  guestEmail: string;
  guestName?: string | null;
  guestLang?: string | null;
  bookingId?: string | null;
  experienceName?: string | null;
  bookingDate?: string | null;
  bookingTime?: string | null;
  guestsCount?: number | null;
  hostName?: string | null;
  subtotal?: string | null;
  serviceFee?: string | null;
  totalPaid?: string | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  meetingPoint?: string | null;
  hostPhone?: string | null;
  bookingUrl?: string | null;
}

/**
 * Send payment confirmation receipt to guest.
 * Fail-safe: logs errors, never throws.
 */
export async function sendPaymentReceipt(
  params: SendPaymentReceiptParams,
): Promise<SendBrevoEmailResult> {
  try {
    return await sendBrevoEmail({
      toEmail: params.guestEmail,
      toName: params.guestName,
      templateName: 'paymentReceipt',
      lang: params.guestLang,
      params: {
        GUEST_NAME: params.guestName || 'Traveler',
        BOOKING_ID: params.bookingId || '',
        EXPERIENCE_NAME: params.experienceName || '',
        BOOKING_DATE: params.bookingDate || '',
        BOOKING_TIME: params.bookingTime || '',
        GUESTS_COUNT: params.guestsCount ?? '',
        HOST_NAME: params.hostName || '',
        SUBTOTAL: params.subtotal ?? '',
        SERVICE_FEE: params.serviceFee ?? '',
        TOTAL_PAID: params.totalPaid ?? '',
        PAYMENT_METHOD: params.paymentMethod || 'Carte bancaire',
        PAYMENT_DATE: params.paymentDate || '',
        MEETING_POINT: params.meetingPoint || '',
        HOST_PHONE: params.hostPhone || '',
        BOOKING_URL: params.bookingUrl || 'https://okeyo.ma/bookings',
      },
      tags: ['payment', 'receipt'],
    });
  } catch (e) {
    console.error('[BrevoEmail] sendPaymentReceipt unexpected error:', (e as Error).message);
    return { success: false, error: `Unexpected error: ${(e as Error).message}` };
  }
}
