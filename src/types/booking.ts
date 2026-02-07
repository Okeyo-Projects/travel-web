import { z } from 'zod';

/**
 * Common types
 */
export type RoomSelection = {
  roomId: string;
  quantity: number;
};

/**
 * Booking types
 */

export const BookingStatus = z.enum([
  'draft',
  'pending_payment',
  'confirmed',
  'cancelled',
  'completed',
  'refunded',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const BookingSchema = z.object({
  id: z.string().uuid(),
  experienceId: z.string().uuid(),
  guestId: z.string().uuid(),
  hostId: z.string().uuid(),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  adults: z.number().int().positive(),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0),
  departureId: z.string().uuid().optional(), // For trips
  rooms: z.array(z.object({
    roomTypeId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(), // For lodging
  priceSubtotalCents: z.number().int().nonnegative(),
  priceFeesCents: z.number().int().nonnegative().default(0),
  priceTaxesCents: z.number().int().nonnegative().default(0),
  priceTotalCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  status: BookingStatus,
  guestNotes: z.string().optional(),
  hostNotes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const CreateBookingSchema = z.object({
  experienceId: z.string().uuid(),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  adults: z.number().int().positive(),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0),
  departureId: z.string().uuid().optional(),
  rooms: z.array(z.object({
    roomTypeId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(),
  guestNotes: z.string().optional(),
});
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
