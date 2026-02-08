import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const checkAvailabilitySchema = z.object({
  experience_id: z.string().uuid().describe('UUID of the experience'),
  date_from: z.string().describe('Start date in YYYY-MM-DD format'),
  date_to: z.string().optional().describe('End date in YYYY-MM-DD format (for lodging)'),
  guests: z.number().optional().describe('Number of guests/participants'),
});

export const checkAvailability = tool({
  description: `Check availability for an experience on specific dates.
For lodging: checks room availability between date_from and date_to.
For trips: checks upcoming departures after date_from.
For activities: checks upcoming sessions after date_from.
Returns available options with pricing.`,
  inputSchema: checkAvailabilitySchema,
  execute: async ({ experience_id, date_from, date_to, guests }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      // Get experience type
      const { data: experience, error: expError } = await db
        .from('experiences')
        .select('type')
        .eq('id', experience_id)
        .single();

      if (expError || !experience) {
        return {
          success: false,
          error: 'Experience not found',
        };
      }

      if (experience.type === 'lodging') {
        // Check lodging availability by checking actual bookings
        const { data: roomTypes } = await db
          .from('lodging_room_types')
          .select('id, room_type, name, capacity_beds, max_persons, price_cents, total_rooms')
          .eq('experience_id', experience_id)
          .is('deleted_at', null);

        if (!roomTypes || roomTypes.length === 0) {
          return {
            success: true,
            type: 'lodging',
            available: false,
            message: 'No room types available',
          };
        }

        // Check availability for each room type by counting overlapping bookings
        const availabilityChecks = await Promise.all(
          roomTypes.map(async (roomType: any) => {
            // Get all active bookings that overlap with the requested date range
            const { data: overlappingBookings } = await db
              .from('bookings')
              .select('id')
              .eq('experience_id', experience_id)
              .eq('room_type_id', roomType.id)
              .in('status', ['pending', 'confirmed', 'ongoing'])
              .lte('check_in', date_to || date_from)
              .gte('check_out', date_from);

            const bookedRooms = overlappingBookings?.length || 0;
            const totalRooms = roomType.total_rooms || 1;
            const availableRooms = totalRooms - bookedRooms;

            // Check if room capacity meets guest requirements
            const meetsGuestRequirement = !guests || roomType.max_persons >= guests;
            const hasAvailability = availableRooms > 0 && meetsGuestRequirement;

            return {
              room_type_id: roomType.id,
              room_type: roomType.room_type,
              name: roomType.name,
              capacity_beds: roomType.capacity_beds,
              max_persons: roomType.max_persons,
              base_price_mad: roomType.price_cents / 100,
              available: hasAvailability,
              total_rooms: totalRooms,
              available_rooms: availableRooms,
              booked_rooms: bookedRooms,
            };
          })
        );

        const hasAnyAvailability = availabilityChecks.some(check => check.available);

        return {
          success: true,
          type: 'lodging',
          available: hasAnyAvailability,
          date_from,
          date_to,
          room_types: availabilityChecks,
        };
      } else if (experience.type === 'trip') {
        // Check trip departures
        const { data: departures } = await db
          .from('trip_departures')
          .select('*')
          .eq('experience_id', experience_id)
          .eq('status', 'scheduled')
          .gte('depart_at', date_from)
          .order('depart_at', { ascending: true })
          .limit(20);

        const availableDepartures = departures?.filter(
          (dep: any) => dep.seats_available > 0 && (!guests || dep.seats_available >= guests)
        );

        return {
          success: true,
          type: 'trip',
          available: (availableDepartures?.length || 0) > 0,
          departures: availableDepartures?.map((dep: any) => ({
            id: dep.id,
            depart_at: dep.depart_at,
            return_at: dep.return_at,
            seats_available: dep.seats_available,
            seats_total: dep.seats_total,
            price_mad: dep.price_override_cents ? dep.price_override_cents / 100 : null,
            status: dep.status,
          })) || [],
        };
      } else if (experience.type === 'activity') {
        // Check activity sessions
        const { data: sessions } = await db
          .from('activity_sessions')
          .select('*')
          .eq('experience_id', experience_id)
          .eq('status', 'scheduled')
          .gte('start_at', date_from)
          .order('start_at', { ascending: true })
          .limit(20);

        const availableSessions = sessions?.filter(
          (session: any) => session.capacity_available > 0 && (!guests || session.capacity_available >= guests)
        );

        return {
          success: true,
          type: 'activity',
          available: (availableSessions?.length || 0) > 0,
          sessions: availableSessions?.map((session: any) => ({
            id: session.id,
            start_at: session.start_at,
            end_at: session.end_at,
            capacity_available: session.capacity_available,
            capacity_total: session.capacity_total,
            price_mad: session.price_override_cents ? session.price_override_cents / 100 : null,
            status: session.status,
          })) || [],
        };
      }

      return {
        success: false,
        error: 'Unknown experience type',
      };
    } catch (error) {
      console.error('Check availability error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
