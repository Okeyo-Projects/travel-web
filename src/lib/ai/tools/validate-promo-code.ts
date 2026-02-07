import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const validatePromoCodeSchema = z.object({
  code: z.string().describe('Promo code to validate'),
  experience_id: z.string().uuid().describe('UUID of the experience'),
  user_id: z.string().uuid().optional().describe('UUID of the user (if logged in)'),
  check_in: z.string().optional().describe('Check-in date in YYYY-MM-DD format'),
  nights: z.number().optional().describe('Number of nights (for lodging)'),
  guests: z.number().optional().describe('Number of guests'),
  amount_mad: z.number().describe('Booking amount in MAD before discount'),
});

export const validatePromoCode = tool({
  description: `Validate a promo code entered by the user and calculate the discount.
Returns whether the code is valid, the discount amount, and the new total.`,
  inputSchema: validatePromoCodeSchema,
  execute: async (params) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      const amountCents = params.amount_mad * 100;

      const { data: validationResult, error } = await db.rpc('validate_promo_code', {
        promo_code: params.code,
        exp_id: params.experience_id,
        p_user_id: params.user_id || null,
        check_in_date: params.check_in || null,
        nights: params.nights || null,
        guests: params.guests || null,
        amount_cents: amountCents,
      });

      if (error) {
        console.error('Validate promo code error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      const result = validationResult?.[0];

      if (!result) {
        return {
          success: false,
          error: 'No validation result',
        };
      }

      if (result.valid) {
        return {
          success: true,
          valid: true,
          promotion_id: result.promotion_id,
          discount_mad: result.discount_cents / 100,
          original_total_mad: params.amount_mad,
          new_total_mad: result.new_total_cents / 100,
          savings_mad: result.discount_cents / 100,
        };
      } else {
        return {
          success: true,
          valid: false,
          error_message: result.error_message,
        };
      }
    } catch (error) {
      console.error('Validate promo code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
