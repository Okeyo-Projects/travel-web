// infra/supabase/functions/calculate-quote/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface QuoteInput {
  experienceId: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  selectedRooms?: { roomId: string; quantity: number }[];
  selectedDepartureId?: string;
  promotionCode?: string; // Added for promotion support
  userId?: string;        // Added for promotion support
}

interface QuoteBreakdownItem {
  label: string;
  amountCents: number;
}

interface BookingQuote {
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  discountCents: number; // Added for promotion support
  totalCents: number;
  currency: string;
  nights: number;
  breakdown: QuoteBreakdownItem[];
  success: boolean; // Added for RPC result
  message: string;  // Added for RPC result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      experienceId,
      startDate: startDateStr,
      endDate: endDateStr,
      adults = 1,
      children = 0,
      infants = 0,
      selectedRooms = [],
      selectedDepartureId,
      promotionCode, // Destructure new fields
      userId,        // Destructure new fields
    }: QuoteInput = await req.json();

    if (!experienceId) {
      return new Response(JSON.stringify({ error: 'experienceId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Call the PostgreSQL stored procedure directly
    const { data, error } = await supabase.rpc('get_booking_quote', {
      p_experience_id: experienceId,
      p_from_date: startDateStr,
      p_to_date: endDateStr,
      p_adults: adults,
      p_children: children,
      p_infants: infants,
      p_rooms: selectedRooms.length > 0 ? JSON.stringify(selectedRooms.map(r => ({ room_type_id: r.roomId, quantity: r.quantity }))) : null,
      p_departure_id: selectedDepartureId ?? null,
      p_promotion_code: promotionCode ?? null, // Pass promotion code
      p_user_id: userId ?? null,              // Pass user ID
    });

    if (error) {
      throw error;
    }

    // RPC returns an array with one result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      return new Response(JSON.stringify({ error: result?.message || 'Failed to get quote from DB function' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform result to match existing BookingQuote interface
    const quote: BookingQuote = {
      subtotalCents: result.subtotal_cents,
      feesCents: result.fees_cents,
      taxesCents: result.taxes_cents,
      discountCents: result.discount_cents,
      totalCents: result.total_cents,
      currency: result.currency,
      nights: result.nights,
      breakdown: result.breakdown.map((item: any) => ({
        label: item.label,
        amountCents: item.amount_cents,
      })),
      success: result.success,
      message: result.message,
    };

    return new Response(JSON.stringify(quote), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
