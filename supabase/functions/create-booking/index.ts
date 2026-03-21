// infra/supabase/functions/create-booking/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
  rooms?: { room_type_id: string; quantity: number }[];
  partyDetails?: Record<string, unknown>;
  guestNotes?: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

async function createBooking(supabase: any, request: CreateBookingRequest) {
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
    p_rooms: request.rooms ? (request.rooms as unknown as any) : null,
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
      totalCents: request.totalCents,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    console.log('Calling RPC create_booking_with_availability...');
    const result = await createBooking(supabase, request);
    console.log('Booking created successfully:', result.id);

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
