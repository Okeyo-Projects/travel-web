// infra/supabase/functions/create-booking/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { notifyHostOfBooking } from '../_shared/brevo-email.ts';

interface CreateBookingRequest {
  experienceId: string;
  hostId: string;
  guestId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  infants: number;
  departureId?: string | null;
  rooms?: { room_type_id: string; quantity: number }[] | string | null;
  partyDetails?: Record<string, unknown>;
  guestNotes?: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

type ServiceRoleClient = ReturnType<typeof createClient>;

type RoomSelection = { room_type_id: string; quantity: number };

function normalizeRoomsInput(rooms: unknown): RoomSelection[] | null {
  if (rooms == null) {
    return null;
  }

  let parsedRooms = rooms;

  if (typeof parsedRooms === 'string') {
    try {
      parsedRooms = JSON.parse(parsedRooms);
    } catch (error) {
      console.error('Failed to parse rooms payload:', error);
      throw new Error('Invalid rooms payload: expected a JSON array');
    }
  }

  if (!Array.isArray(parsedRooms)) {
    throw new Error('Invalid rooms payload: expected an array');
  }

  return parsedRooms.map((room, index) => {
    if (!room || typeof room !== 'object') {
      throw new Error(`Invalid rooms payload at index ${index}`);
    }

    const roomTypeId = (room as Record<string, unknown>).room_type_id;
    const quantity = (room as Record<string, unknown>).quantity;

    if (typeof roomTypeId !== 'string' || !roomTypeId.trim()) {
      throw new Error(`Invalid room_type_id at index ${index}`);
    }

    if (!Number.isInteger(quantity) || Number(quantity) < 1) {
      throw new Error(`Invalid room quantity at index ${index}`);
    }

    return {
      room_type_id: roomTypeId,
      quantity: Number(quantity),
    };
  });
}

async function createBooking(supabase: ServiceRoleClient, request: CreateBookingRequest) {
  const normalizedRooms = normalizeRoomsInput(request.rooms);

  const rpcParams = {
    p_experience_id: request.experienceId,
    p_guest_id: request.guestId,
    p_host_id: request.hostId,
    p_from_date: request.fromDate,
    p_to_date: request.toDate,
    p_adults: request.adults,
    p_children: request.children,
    p_infants: request.infants,
    p_departure_id: request.departureId ?? null,
    p_session_id: null, // TODO: Add session_id support for activities
    p_rooms: normalizedRooms,
    p_price_subtotal_cents: request.subtotalCents,
    p_price_fees_cents: request.feesCents,
    p_price_taxes_cents: request.taxesCents,
    p_price_total_cents: request.totalCents,
    p_currency: request.currency,
    p_guest_notes: request.guestNotes ?? null,
  };

  // console.log('RPC params:', JSON.stringify(rpcParams)); // Uncomment for deep debugging

  const { data, error } = await supabase.rpc('create_booking_with_availability', rpcParams);

  if (error) {
    console.error('RPC create_booking_with_availability failed:', error);
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  console.log('RPC result:', result);

  if (!result || !result.success) {
    console.error('RPC returned failure success=false:', result);
    throw new Error(result?.message || 'Failed to create booking');
  }

  // Fetch the created booking with relations to return to the client
  const { data: bookingData, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      experience:experiences(id, title, type, city, thumbnail_url),
      guest:profiles!bookings_guest_id_fkey(id, display_name, avatar_url),
      departure:trip_departures(id, depart_at, return_at, seats_total, seats_available)
    `)
    .eq('id', result.booking_id)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch created booking:', fetchError);
    throw fetchError;
  }

  return bookingData;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: CreateBookingRequest = await req.json();

    console.log('Received create-booking request:', {
      experienceId: request.experienceId,
      hostId: request.hostId,
      guestId: request.guestId,
      dates: { from: request.fromDate, to: request.toDate },
      people: { adults: request.adults, children: request.children, infants: request.infants },
      roomsType:
        request.rooms == null
          ? null
          : Array.isArray(request.rooms)
            ? 'array'
            : typeof request.rooms,
      totalCents: request.totalCents,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Calling RPC create_booking_with_availability...');
    const result = await createBooking(supabase, request);
    console.log('Booking created successfully:', result.id);

    // ── Send email notification to host (fail-safe) ──
    try {
      const { data: hostProfile, error: hostError } = await supabase
        .from('profiles')
        .select('email, display_name, preferred_language')
        .eq('id', request.hostId)
        .maybeSingle();

      if (hostError) {
        console.error('[create-booking] Failed to fetch host profile for email:', hostError.message);
      } else if (hostProfile?.email) {
        const guestName = result?.guest?.display_name || 'A guest';
        const experienceName = result?.experience?.title || 'Your experience';
        const guestsCount = request.adults + request.children;
        const totalPrice = (request.totalCents / 100).toFixed(2);
        const dateRange = request.fromDate === request.toDate
          ? request.fromDate
          : `${request.fromDate} → ${request.toDate}`;

        const emailResult = await notifyHostOfBooking({
          hostEmail: hostProfile.email,
          hostName: hostProfile.display_name,
          hostLang: hostProfile.preferred_language,
          guestName: guestName,
          experienceName: experienceName,
          bookingDate: dateRange,
          guestsCount: guestsCount,
          totalPrice: totalPrice,
          dashboardUrl: `https://okeyo.ma/host/bookings/${result.id}`,
        });

        if (emailResult.success) {
          console.log('[create-booking] Host notification email sent:', emailResult.messageId);
        } else {
          console.error('[create-booking] Host notification email failed:', emailResult.error);
        }
      } else {
        console.warn('[create-booking] Host email not found, skipping notification for host:', request.hostId);
      }
    } catch (emailError) {
      console.error('[create-booking] Unexpected error sending host email:', (emailError as Error).message);
      // Never throw — email failure must not break booking creation
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-booking function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
