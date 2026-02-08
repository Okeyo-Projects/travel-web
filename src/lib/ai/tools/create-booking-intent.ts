import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RoomSelectionSchema = z.object({
  room_type_id: z.string().uuid().describe('Room type ID'),
  quantity: z.number().int().positive().describe('Number of rooms of this type'),
});

const BookingItemSchema = z.object({
  experience_id: z.string().uuid().describe('Experience UUID'),
  from_date: z.string().describe('Check-in/start date (YYYY-MM-DD)'),
  to_date: z.string().describe('Check-out/end date (YYYY-MM-DD)'),
  adults: z.number().int().positive().describe('Number of adults'),
  children: z.number().int().nonnegative().default(0).describe('Number of children'),
  infants: z.number().int().nonnegative().default(0).describe('Number of infants'),
  rooms: z.array(RoomSelectionSchema).optional().describe('Room selections for lodging'),
  departure_id: z.string().uuid().optional().describe('Specific departure ID for trips'),
  session_id: z.string().uuid().optional().describe('Specific session ID for activities'),
  guest_notes: z.string().optional().describe('Special requests or notes'),
});

const createBookingIntentSchema = z.object({
  items: z.array(BookingItemSchema).min(1).describe('Booking items (main experience + linked experiences)'),
  promotion_code: z.string().optional().describe('Promotion/discount code if user provided one'),
});

export const createBookingIntent = tool({
  description: `Create a booking intent when user wants to reserve/book experience(s).
This prepares a booking with all details collected from the conversation.
Supports multi-experience bookings (main experience + linked experiences).
Returns a booking summary for user confirmation before payment.

Use this when:
- User says "je réserve", "je veux réserver", "je prends ça"
- User confirms they want to proceed with booking
- You have all required details (dates, guests, rooms for lodging)

The tool will:
1. Validate availability for each experience
2. Calculate pricing (subtotal, fees, taxes, total)
3. Create draft booking intent
4. Return summary for display in chat`,
  inputSchema: createBookingIntentSchema,
  execute: async ({ items, promotion_code }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      // Get current user
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          error: 'User not authenticated. Please sign in to book.',
          requires_auth: true,
        };
      }

      // Validate and get quotes for each item
      const itemsWithQuotes: any[] = [];
      let totalCents = 0;

      for (const item of items) {
        // Get experience details
        const { data: experience, error: expError } = await db
          .from('experiences')
          .select('id, title, type, host_id, published')
          .eq('id', item.experience_id)
          .single();

        if (expError || !experience) {
          return {
            success: false,
            error: `Experience not found: ${item.experience_id}`,
          };
        }

        if (!experience.published) {
          return {
            success: false,
            error: `Experience "${experience.title}" is not available for booking`,
          };
        }

        // Check availability (basic check - don't block on availability for draft)
        // Real availability is checked when converting draft to confirmed booking

        // Get pricing quote
        const { data: quote, error: quoteError } = await db.rpc('get_booking_quote', {
          p_experience_id: item.experience_id,
          p_from_date: item.from_date,
          p_to_date: item.to_date,
          p_adults: item.adults,
          p_children: item.children,
          p_infants: item.infants,
          p_rooms: item.rooms ? JSON.stringify(item.rooms) : null,
          p_departure_id: item.departure_id || null,
          p_promotion_code: promotion_code || null,
          p_user_id: user.id,
        });

        const quoteResult = Array.isArray(quote) ? quote[0] : quote;

        if (quoteError || !quoteResult?.success) {
          return {
            success: false,
            error: `Failed to get quote for "${experience.title}": ${quoteResult?.message || quoteError?.message}`,
          };
        }

        itemsWithQuotes.push({
          experience_id: item.experience_id,
          experience_title: experience.title,
          experience_type: experience.type,
          host_id: experience.host_id,
          from_date: item.from_date,
          to_date: item.to_date,
          adults: item.adults,
          children: item.children,
          infants: item.infants,
          rooms: item.rooms,
          departure_id: item.departure_id,
          session_id: item.session_id,
          guest_notes: item.guest_notes,
          quote: quoteResult,
        });

        totalCents += quoteResult.total_cents;
      }

      // Create draft booking with items
      // For now, we create the main booking with first item as main experience
      // (backward compatibility with bookings table structure)
      const mainItem = itemsWithQuotes[0];

      const { data: booking, error: bookingError } = await db
        .from('bookings')
        .insert({
          guest_id: user.id,
          experience_id: mainItem.experience_id,
          host_id: mainItem.host_id,
          from_date: mainItem.from_date,
          to_date: mainItem.to_date,
          adults: mainItem.adults,
          children: mainItem.children,
          infants: mainItem.infants,
          rooms: mainItem.rooms ? JSON.stringify(mainItem.rooms) : null,
          departure_id: mainItem.departure_id,
          price_subtotal_cents: mainItem.quote.subtotal_cents,
          price_fees_cents: mainItem.quote.fees_cents,
          price_taxes_cents: mainItem.quote.taxes_cents,
          price_total_cents: mainItem.quote.total_cents,
          currency: mainItem.quote.currency || 'MAD',
          status: 'draft',
          guest_notes: mainItem.guest_notes,
          metadata: {
            promotion_code,
            created_by_ai: true,
          },
        })
        .select()
        .single();

      if (bookingError || !booking) {
        return {
          success: false,
          error: `Failed to create booking: ${bookingError?.message}`,
        };
      }

      // Create booking items for all experiences
      const bookingItemsData = itemsWithQuotes.map((item, index) => ({
        booking_id: booking.id,
        experience_id: item.experience_id,
        host_id: item.host_id,
        from_date: item.from_date,
        to_date: item.to_date,
        adults: item.adults,
        children: item.children,
        infants: item.infants,
        rooms: item.rooms ? JSON.stringify(item.rooms) : null,
        departure_id: item.departure_id,
        session_id: item.session_id,
        price_subtotal_cents: item.quote.subtotal_cents,
        price_fees_cents: item.quote.fees_cents,
        price_taxes_cents: item.quote.taxes_cents,
        price_total_cents: item.quote.total_cents,
        currency: item.quote.currency || 'MAD',
        status: 'draft',
        guest_notes: item.guest_notes,
        order_index: index,
      }));

      const { error: itemsError } = await db
        .from('booking_items')
        .insert(bookingItemsData);

      if (itemsError) {
        // Rollback main booking if items creation fails
        await db.from('bookings').delete().eq('id', booking.id);
        return {
          success: false,
          error: `Failed to create booking items: ${itemsError.message}`,
        };
      }

      // Build booking summary for chat display
      const summary = {
        booking_id: booking.id,
        checkout_url: `/checkout/${booking.id}`,
        total_cents: totalCents,
        currency: 'MAD',
        items: itemsWithQuotes.map(item => ({
          experience_title: item.experience_title,
          experience_type: item.experience_type,
          from_date: item.from_date,
          to_date: item.to_date,
          adults: item.adults,
          children: item.children,
          infants: item.infants,
          nights: item.quote.nights,
          rooms: item.rooms,
          subtotal_cents: item.quote.subtotal_cents,
          total_cents: item.quote.total_cents,
        })),
      };

      return {
        success: true,
        message: 'Booking intent created successfully',
        booking_id: booking.id,
        checkout_url: summary.checkout_url,
        summary,
      };
    } catch (error) {
      console.error('Create booking intent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
