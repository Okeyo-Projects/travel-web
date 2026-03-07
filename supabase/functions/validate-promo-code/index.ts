// infra/supabase/functions/validate-promo-code/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ValidatePromoRequest {
  code: string;
  userId: string;
  bookingAmountCents: number;
  experienceId: string;
  experienceType: 'trip' | 'lodging' | 'activity';
}

async function validatePromoCode(supabase: any, request: ValidatePromoRequest) {
  // 1. Find promotion by code
  const { data: promotion, error: fetchError } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', request.code.toUpperCase())
    .eq('status', 'active')
    .lte('valid_from', new Date().toISOString())
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
    .single();

  if (fetchError || !promotion) {
    return {
      valid: false,
      error: { code: 'INVALID_CODE', message: 'Promo code not found or expired' }
    };
  }

  // 2. Check minimum booking amount
  if (promotion.min_booking_amount_cents && request.bookingAmountCents < promotion.min_booking_amount_cents) {
    return {
      valid: false,
      error: {
        code: 'MIN_AMOUNT_NOT_MET',
        message: `Minimum booking amount of $${(promotion.min_booking_amount_cents / 100).toFixed(2)} required`
      }
    };
  }

  // 3. Check experience type eligibility
  if (promotion.applicable_experience_types && promotion.applicable_experience_types.length > 0) {
    if (!promotion.applicable_experience_types.includes(request.experienceType)) {
      return {
        valid: false,
        error: { code: 'EXPERIENCE_TYPE_MISMATCH', message: 'This promo code is not valid for this experience type' }
      };
    }
  }

  // 4. Check experience ID eligibility
  if (promotion.applicable_experience_ids && promotion.applicable_experience_ids.length > 0) {
    if (!promotion.applicable_experience_ids.includes(request.experienceId)) {
      return {
        valid: false,
        error: { code: 'EXPERIENCE_NOT_ELIGIBLE', message: 'This promo code is not valid for this experience' }
      };
    }
  }

  // 5. Check usage limits
  const { data: eligibilityData } = await supabase.rpc('is_promotion_available', {
    p_promotion_id: promotion.id,
    p_user_id: request.userId,
    p_booking_amount_cents: request.bookingAmountCents,
    p_experience_id: request.experienceId
  });

  if (!eligibilityData) {
    return {
      valid: false,
      error: { code: 'NOT_ELIGIBLE', message: 'You are not eligible for this promotion' }
    };
  }

  // 6. Calculate discount
  const { data: discountAmount } = await supabase.rpc('calculate_discount_amount', {
    p_promotion_id: promotion.id,
    p_booking_amount_cents: request.bookingAmountCents
  });

  return {
    valid: true,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountAmountCents: discountAmount || 0,
      finalAmountCents: request.bookingAmountCents - (discountAmount || 0),
      discountType: promotion.discount_type,
      discountValue: promotion.discount_value
    }
  };
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: ValidatePromoRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const result = await validatePromoCode(supabase, request);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
