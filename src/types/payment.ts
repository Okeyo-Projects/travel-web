import { z } from 'zod';

/**
 * Payment types
 */

export const PaymentStatus = z.enum([
  'pending',
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  provider: z.string(),
  providerRef: z.string().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  status: PaymentStatus,
  failureReason: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const CreatePaymentIntentSchema = z.object({
  bookingId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  returnUrl: z.string().url().optional(),
});
export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>;

export const PaymentIntentResponseSchema = z.object({
  intentId: z.string(),
  clientSecret: z.string().optional(),
  status: PaymentStatus,
  amountCents: z.number().int(),
  currency: z.string(),
});
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;

