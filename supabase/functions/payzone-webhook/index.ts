import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { hmacSha256Hex } from '../_shared/utils-crypto.ts';
import { sendPaymentReceipt } from '../_shared/brevo-email.ts';

type InternalPaymentStatus =
  | 'pending'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

type PayzoneWebhookPayload = Record<string, unknown>;

type BookingNotificationRow = {
  id: string;
  status: string | null;
  guest_id: string;
  host_id: string | null;
  experience?: {
    id?: string | null;
    title?: string | null;
  } | null;
};

function mapPayzoneStatus(status: string): InternalPaymentStatus {
  switch (status) {
    case 'CHARGED':
      return 'succeeded';
    case 'CHARGE_PENDING':
    case 'AUTHORIZE_PENDING':
    case 'AUTHORIZED':
    case 'REFUND_PENDING':
    case 'CHARGEBACK_PENDING':
    case 'CREDITED_PENDING':
      return 'processing';
    case 'REFUNDED':
    case 'CREDITED':
      return 'refunded';
    case 'CANCELLED':
    case 'AUTH_REVERSED':
      return 'cancelled';
    case 'DECLINED':
    case 'ERROR':
    case 'CHARGED_BACK':
      return 'failed';
    case 'CHARGEBACK_REVERSED':
      return 'succeeded';
    default:
      return 'pending';
  }
}

async function updatePaymentRecord(
  supabaseAdmin: ReturnType<typeof createClient>,
  paymentId: string,
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(payload)
    .eq('id', paymentId)
    .select();

  return {
    data: data?.[0] ?? null,
    error,
  };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const PAYZONE_NOTIFICATION_KEY = Deno.env.get('PAYZONE_NOTIFICATION_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response('Server Config Error', { status: 500 });
    }

    if (!PAYZONE_NOTIFICATION_KEY) {
      console.error('Missing PAYZONE_NOTIFICATION_KEY');
      return new Response('Server Config Error', { status: 500 });
    }

    // 1. Read Raw Body
    const rawBody = await req.text();
    const headerSig = req.headers.get('X-callback-signature') ?? '';

    // 2. Verify Signature
    const calculatedSig = await hmacSha256Hex(PAYZONE_NOTIFICATION_KEY, rawBody);

    if (!headerSig || calculatedSig.toLowerCase() !== headerSig.toLowerCase()) {
      console.warn('Invalid Payzone callback signature', {
        header: headerSig,
        calculated: calculatedSig,
      });
      return new Response('Invalid signature', { status: 400 });
    }

    // 3. Parse Payload
    let payload: PayzoneWebhookPayload;
    try {
      const parsedPayload = JSON.parse(rawBody);
      if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
        return new Response('Invalid JSON', { status: 400 });
      }
      payload = parsedPayload as PayzoneWebhookPayload;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const status = typeof payload.status === 'string' ? payload.status : '';
    const id = typeof payload.id === 'string' ? payload.id : null;
    const chargeId = typeof payload.chargeId === 'string' ? payload.chargeId : null;
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : null;
    const internalId =
      typeof payload.internalId === 'string' || typeof payload.internalId === 'number'
        ? String(payload.internalId)
        : null;

    // "orderId" in payload corresponds to our UUID sent during session creation.
    // "id" is Payzone's internal ID (e.g. cs_...).
    const dbPaymentId = orderId;
    const payzoneId = id ?? chargeId;

    if (!dbPaymentId) {
      console.warn('Missing orderId (dbPaymentId) in callback');
      return new Response('OK', { status: 200 }); // Ack to stop retries
    }

    console.log(
      `Processing webhook for payment ${dbPaymentId} (Payzone ID: ${payzoneId}), status: ${status}`,
    );

    const newStatus = mapPayzoneStatus(status);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const paymentUpdatePayload = {
      status: newStatus,
      payzone_charge_id: payzoneId,
      payzone_internal_id: internalId,
      payzone_raw_notification: payload,
      updated_at: new Date().toISOString(),
    };

    const { data: payment, error: updateError } = await updatePaymentRecord(
      supabaseAdmin,
      dbPaymentId,
      paymentUpdatePayload,
    );

    if (updateError) {
      console.error('Failed to update payment', updateError);
      return new Response('OK', { status: 200 });
    }

    if (!payment) {
      return new Response(
        JSON.stringify({ status: 'OK', message: 'Payment not found after update' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const bookingId = payment.booking_id;

    // Explicitly update booking if payment succeeded
    if (newStatus === 'succeeded' && bookingId) {
      // Fetch booking to check current status & receiver IDs
      const { data: rawBookingData, error: bookingFetchError } = await supabaseAdmin
        .from('bookings')
        .select('id, status, guest_id, host_id, experience:experiences(id, title)')
        .eq('id', bookingId)
        .single();

      if (bookingFetchError) {
        console.error('Failed to load booking for payment success', bookingFetchError);
      }

      const bookingData = rawBookingData as BookingNotificationRow | null;
      const canConfirm =
        bookingData?.status && ['approved', 'pending_payment'].includes(bookingData.status);

      if (canConfirm) {
        const { error: bookingError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_intent_id: dbPaymentId, // link payment
          })
          .eq('id', bookingId)
          .in('status', ['approved', 'pending_payment']);

        if (bookingError) {
          console.error('Failed to update booking status', bookingError);
        }
      } else if (bookingData) {
        console.log('Skipping status update; booking not in payable state', {
          bookingId,
          currentStatus: bookingData.status,
        });
      }

      // Send Payment Success Notifications only when booking is (or was) confirmable
      if (bookingData && (canConfirm || bookingData.status === 'confirmed')) {
        const experienceTitle = bookingData.experience?.title || 'Experience';
        const experienceId = bookingData.experience?.id;

        // ── Push notifications (existing) ──
        try {
          // Guest: booking confirmed
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              type: 'booking_confirmed',
              userId: bookingData.guest_id,
              data: { booking_id: bookingId, experience_id: experienceId },
              variables: { experience: experienceTitle },
            },
          });

          // Host: payment received
          if (bookingData.host_id) {
            await supabaseAdmin.functions.invoke('send-push-notification', {
              body: {
                type: 'booking_paid',
                userId: bookingData.host_id,
                data: { booking_id: bookingId, experience_id: experienceId },
                variables: { experience: experienceTitle },
              },
            });
          }
        } catch (pushError) {
          console.error('[payzone-webhook] Push notification error (non-blocking):', (pushError as Error).message);
        }

        // ── Brevo payment receipt email to guest (new) ──
        try {
          // Fetch guest profile
          const { data: guestProfile, error: guestError } = await supabaseAdmin
            .from('profiles')
            .select('email, display_name, preferred_language')
            .eq('id', bookingData.guest_id)
            .maybeSingle();

          if (guestError) {
            console.error('[payzone-webhook] Failed to fetch guest profile for email:', guestError.message);
          } else if (guestProfile?.email) {
            // Fetch host profile
            const { data: hostProfile, error: hostError } = await supabaseAdmin
              .from('profiles')
              .select('display_name, phone')
              .eq('id', bookingData.host_id)
              .maybeSingle();

            if (hostError) {
              console.warn('[payzone-webhook] Failed to fetch host profile:', hostError.message);
            }

            // Fetch booking pricing details (fees are on bookings, not payments)
            let feesCents = 0;
            let subtotalCents = 0;
            let guestsCount = 0;
            let bookingDate = '';
            try {
              const { data: bookingDetails } = await supabaseAdmin
                .from('bookings')
                .select('price_fees_cents, price_subtotal_cents, price_total_cents, adults, children, from_date, to_date')
                .eq('id', bookingId)
                .maybeSingle();

              if (bookingDetails) {
                feesCents = bookingDetails.price_fees_cents || 0;
                subtotalCents = bookingDetails.price_subtotal_cents || (payment.amount_cents - feesCents);
                guestsCount = (bookingDetails.adults || 0) + (bookingDetails.children || 0);
                bookingDate = bookingDetails.from_date === bookingDetails.to_date
                  ? bookingDetails.from_date
                  : `${bookingDetails.from_date} → ${bookingDetails.to_date}`;
              } else {
                subtotalCents = payment.amount_cents || 0;
              }
            } catch (bookingFetchError) {
              console.warn('[payzone-webhook] Could not fetch booking pricing details:', (bookingFetchError as Error).message);
              subtotalCents = payment.amount_cents || 0;
            }

            const totalCents = payment.amount_cents || 0;

            const emailResult = await sendPaymentReceipt({
              guestEmail: guestProfile.email,
              guestName: guestProfile.display_name,
              guestLang: guestProfile.preferred_language,
              bookingId: bookingId,
              experienceName: experienceTitle,
              bookingDate: bookingDate,
              guestsCount: guestsCount,
              hostName: hostProfile?.display_name,
              subtotal: (subtotalCents / 100).toFixed(2),
              serviceFee: (feesCents / 100).toFixed(2),
              totalPaid: (totalCents / 100).toFixed(2),
              paymentMethod: 'Carte bancaire',
              paymentDate: new Date().toISOString(),
              bookingUrl: `https://okeyo.ma/bookings/${bookingId}`,
              hostPhone: hostProfile?.phone,
            });

            if (emailResult.success) {
              console.log('[payzone-webhook] Payment receipt email sent:', emailResult.messageId);
            } else {
              console.error('[payzone-webhook] Payment receipt email failed:', emailResult.error);
            }
          } else {
            console.warn('[payzone-webhook] Guest email not found, skipping receipt for booking:', bookingId);
          }
        } catch (emailError) {
          console.error('[payzone-webhook] Unexpected error sending payment receipt (non-blocking):', (emailError as Error).message);
          // Never throw — email failure must not affect payment processing
        }
      }
    }

    // Send failed notification when payment fails
    if (newStatus === 'failed' && bookingId) {
      try {
        const { data: rawBookingData } = await supabaseAdmin
          .from('bookings')
          .select('experience:experiences(title, id), guest_id')
          .eq('id', bookingId)
          .single();

        const bookingData = rawBookingData as Pick<
          BookingNotificationRow,
          'guest_id' | 'experience'
        > | null;
        if (bookingData) {
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              type: 'payment_failed',
              userId: bookingData.guest_id,
              data: { booking_id: bookingId, experience_id: bookingData.experience?.id },
              variables: {
                experience: bookingData.experience?.title || 'Experience',
              },
            },
          });
        }
      } catch (e) {
        console.error('Failed to send failed notification', e);
      }
    }

    // Return JSON as per example
    const responseData = { status: 'OK', message: 'Status recorded successfully' };
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    // Even on error, maybe return structured JSON if possible, but 500 is fine.
    const errorData = { status: 'KO', message: 'Server Error' };
    return new Response(JSON.stringify(errorData), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
