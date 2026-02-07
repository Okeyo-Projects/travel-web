import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const getExperiencePromosSchema = z.object({
  experience_id: z.string().uuid().describe('UUID of the experience'),
  user_id: z.string().uuid().optional().describe('UUID of the user (if logged in)'),
  check_in: z.string().optional().describe('Check-in date in YYYY-MM-DD format'),
  nights: z.number().optional().describe('Number of nights (for lodging)'),
  guests: z.number().optional().describe('Number of guests'),
  amount_mad: z.number().optional().describe('Booking amount in MAD before discount'),
});

export const getExperiencePromos = tool({
  description: `Get all applicable promotions for an experience with eligibility details.
Shows both eligible promotions and conditional ones with unmet requirements.
Useful for displaying promo information to users.`,
  inputSchema: getExperiencePromosSchema,
  execute: async (params) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      const amountCents = params.amount_mad ? params.amount_mad * 100 : null;

      const { data: promotions, error } = await db.rpc('get_applicable_promotions', {
        exp_id: params.experience_id,
        p_user_id: params.user_id || null,
        check_in_date: params.check_in || null,
        nights: params.nights || null,
        guests: params.guests || null,
        amount_cents: amountCents,
      });

      if (error) {
        console.error('Get promotions error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      const eligible = promotions?.filter((p: any) => p.is_eligible) || [];
      const conditional = promotions?.filter((p: any) => !p.is_eligible) || [];

      return {
        success: true,
        eligible: eligible.map((p: any) => ({
          id: p.promotion_id,
          type: p.promo_type,
          name: p.name,
          description: p.description,
          code: p.code,
          discount_type: p.discount_type,
          discount_value: p.discount_value,
          max_discount_mad: p.max_discount_cents ? p.max_discount_cents / 100 : null,
          estimated_discount_mad: p.estimated_discount_cents ? p.estimated_discount_cents / 100 : null,
          badge_text: p.badge_text,
          auto_apply: p.auto_apply,
        })),
        conditional: conditional.map((p: any) => ({
          id: p.promotion_id,
          type: p.promo_type,
          name: p.name,
          description: p.description,
          code: p.code,
          reason: p.eligibility_reason,
        })),
      };
    } catch (error) {
      console.error('Get experience promos error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
