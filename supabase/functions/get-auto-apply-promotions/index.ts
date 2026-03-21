// infra/supabase/functions/get-auto-apply-promotions/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AutoApplyRequest {
  userId: string;
  bookingAmountCents: number;
  experienceId: string;
  experienceType: string;
}

async function getAutoApplyPromotions(supabase: any, request: AutoApplyRequest) {
  // 1. Check if user has completed bookings
  const { data: eligibility, error: eligibilityError } = await supabase
    .from('user_promotion_eligibility')
    .select('*')
    .eq('user_id', request.userId)
    .single();

  if (eligibilityError && eligibilityError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw eligibilityError;
  }

  const isFirstBooking = !eligibility || !eligibility.has_completed_booking;

  // 2. Build query for auto-apply promotions
  let query = supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .eq('auto_apply', true)
    .lte('valid_from', new Date().toISOString())
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);

  if (isFirstBooking) {
    query = query.or('first_booking_only.eq.true,first_booking_only.eq.false');
  } else {
    query = query.eq('first_booking_only', false);
  }

  const { data: promotions, error } = await query;

  if (error || !promotions) {
    return { promotions: [], bestPromotion: null };
  }

  // 3. Filter and calculate each promotion
  const applicable = [];

  for (const promo of promotions) {
    if (promo.min_booking_amount_cents && request.bookingAmountCents < promo.min_booking_amount_cents) {
      continue;
    }

    if (promo.applicable_experience_types && promo.applicable_experience_types.length > 0) {
      if (!promo.applicable_experience_types.includes(request.experienceType)) {
        continue;
      }
    }

    if (promo.applicable_experience_ids && promo.applicable_experience_ids.length > 0) {
      if (!promo.applicable_experience_ids.includes(request.experienceId)) {
        continue;
      }
    }

    const { data: isEligible } = await supabase.rpc('is_promotion_available', {
      p_promotion_id: promo.id,
      p_user_id: request.userId,
      p_booking_amount_cents: request.bookingAmountCents,
      p_experience_id: request.experienceId
    });

    if (isEligible) {
      const { data: discount } = await supabase.rpc('calculate_discount_amount', {
        p_promotion_id: promo.id,
        p_booking_amount_cents: request.bookingAmountCents
      });

      applicable.push({
        id: promo.id,
        name: promo.name,
        description: promo.description,
        discountAmountCents: discount || 0,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        auto_apply: promo.auto_apply,
        show_badge: promo.show_badge,
        badge_text: promo.badge_text
      });
    }
  }

  // 4. Sort by best discount
  applicable.sort((a, b) => b.discountAmountCents - a.discountAmountCents);

  return {
    promotions: applicable,
    bestPromotion: applicable[0] || null
  };
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: AutoApplyRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const result = await getAutoApplyPromotions(supabase, request);

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
