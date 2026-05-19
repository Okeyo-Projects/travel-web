/**
 * Edge function called by database trigger when a host accepts or rejects a booking.
 * Sends the appropriate Brevo transactional email to the guest.
 * This function is fail-safe: all errors are logged but never thrown to the caller.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  notifyGuestBookingAccepted,
  notifyGuestBookingRejected,
} from '../_shared/brevo-email.ts';

interface WebhookPayload {
  booking_id: string;
  new_status: 'approved' | 'declined';
  guest_id: string;
  host_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Parse request ──
  let payload: WebhookPayload;
  try {
    const body = await req.json();
    if (!body?.booking_id || !body?.new_status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing booking_id or new_status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    payload = body as WebhookPayload;
  } catch (e) {
    console.error('[send-booking-response-email] Invalid JSON payload:', (e as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Validate status ──
  if (payload.new_status !== 'approved' && payload.new_status !== 'declined') {
    console.log('[send-booking-response-email] Ignoring non-action status:', payload.new_status);
    return new Response(
      JSON.stringify({ success: true, message: 'No email needed for this status' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Init Supabase ──
  let supabaseUrl: string;
  let supabaseServiceKey: string;
  try {
    supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
  } catch (e) {
    console.error('[send-booking-response-email] Config error:', (e as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── Fetch booking details ──
  let bookingData: {
    id: string;
    from_date: string | null;
    to_date: string | null;
    adults: number | null;
    children: number | null;
    guest_email: string | null;
    guest_name: string | null;
    guest_lang: string | null;
    host_name: string | null;
    experience_title: string | null;
    meeting_point: string | null;
    cancellation_reason: string | null;
  } | null = null;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        from_date,
        to_date,
        adults,
        children,
        guest:profiles!bookings_guest_id_fkey(email, display_name, preferred_language),
        host:profiles!bookings_host_id_fkey(display_name),
        experience:experiences(title, meeting_point)
      `)
      .eq('id', payload.booking_id)
      .maybeSingle();

    if (error) {
      console.error('[send-booking-response-email] DB fetch error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch booking data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!data) {
      console.warn('[send-booking-response-email] Booking not found:', payload.booking_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Flatten nested relations safely
    const guest = (data as Record<string, unknown>).guest as Record<string, unknown> | null;
    const host = (data as Record<string, unknown>).host as Record<string, unknown> | null;
    const experience = (data as Record<string, unknown>).experience as Record<string, unknown> | null;

    bookingData = {
      id: data.id,
      from_date: data.from_date,
      to_date: data.to_date,
      adults: data.adults,
      children: data.children,
      guest_email: (guest?.email as string) || null,
      guest_name: (guest?.display_name as string) || null,
      guest_lang: (guest?.preferred_language as string) || null,
      host_name: (host?.display_name as string) || null,
      experience_title: (experience?.title as string) || null,
      meeting_point: (experience?.meeting_point as string) || null,
      cancellation_reason: null,
    };
  } catch (e) {
    console.error('[send-booking-response-email] Unexpected fetch error:', (e as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error fetching booking' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Validate guest email ──
  if (!bookingData.guest_email) {
    console.warn('[send-booking-response-email] Guest email missing, skipping email for booking:', payload.booking_id);
    return new Response(
      JSON.stringify({ success: true, message: 'Guest email missing, no email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Build date range string ──
  let dateRange = '';
  try {
    if (bookingData.from_date && bookingData.to_date) {
      dateRange = bookingData.from_date === bookingData.to_date
        ? bookingData.from_date
        : `${bookingData.from_date} → ${bookingData.to_date}`;
    } else if (bookingData.from_date) {
      dateRange = bookingData.from_date;
    }
  } catch (e) {
    console.warn('[send-booking-response-email] Date range build error:', (e as Error).message);
    dateRange = '';
  }

  const guestsCount = (bookingData.adults || 0) + (bookingData.children || 0);

  // ── Send appropriate email ──
  let emailResult;
  try {
    if (payload.new_status === 'approved') {
      emailResult = await notifyGuestBookingAccepted({
        guestEmail: bookingData.guest_email,
        guestName: bookingData.guest_name,
        guestLang: bookingData.guest_lang,
        experienceName: bookingData.experience_title,
        hostName: bookingData.host_name,
        bookingDate: dateRange,
        guestsCount: guestsCount,
        meetingPoint: bookingData.meeting_point,
        paymentUrl: `https://okeyo.ma/bookings/${bookingData.id}/payment`,
      });
    } else {
      emailResult = await notifyGuestBookingRejected({
        guestEmail: bookingData.guest_email,
        guestName: bookingData.guest_name,
        guestLang: bookingData.guest_lang,
        experienceName: bookingData.experience_title,
        bookingDate: dateRange,
        rejectionReason: bookingData.cancellation_reason || 'Host unavailable',
        searchUrl: 'https://okeyo.ma/experiences',
        aiUrl: 'https://okeyo.ma/ai-concierge',
      });
    }

    if (emailResult.success) {
      console.log('[send-booking-response-email] Email sent successfully:', {
        bookingId: payload.booking_id,
        status: payload.new_status,
        messageId: emailResult.messageId,
      });
    } else {
      console.error('[send-booking-response-email] Email send failed:', {
        bookingId: payload.booking_id,
        status: payload.new_status,
        error: emailResult.error,
      });
    }

    return new Response(
      JSON.stringify({
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[send-booking-response-email] Unexpected email send error:', (e as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: `Unexpected error: ${(e as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
