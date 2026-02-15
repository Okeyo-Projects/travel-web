import { tool } from 'ai';
import { z } from 'zod';
import { aiDebug } from '@/lib/ai/debug-log';
import { createClient } from '@/lib/supabase/server';

const getExperienceDetailsSchema = z
  .object({
    experience_id: z
      .string()
      .uuid()
      .optional()
      .describe('UUID of the experience to get details for'),
    experience_name: z
      .string()
      .min(2)
      .max(160)
      .optional()
      .describe('Optional experience name/title hint to resolve the right ID'),
  })
  .refine(
    (value) => Boolean(value.experience_id || value.experience_name),
    'experience_id or experience_name is required',
  );

export const getExperienceDetails = tool({
  description: `Get comprehensive details about a specific experience including:
- Full description and media
- Host information
- Type-specific details (room types for lodging, itinerary for trips, etc.)
- Amenities and services
- Recent reviews
- Active promotions
Use this when users want to know more about a specific experience.`,
  inputSchema: getExperienceDetailsSchema,
  execute: async ({ experience_id, experience_name }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;
      const requestTraceId = crypto.randomUUID().slice(0, 8);
      const trimmedName =
        typeof experience_name === 'string' ? experience_name.trim() : '';

      aiDebug('tool.getExperienceDetails', 'start', {
        requestTraceId,
        experience_id: experience_id || null,
        experience_name: trimmedName || null,
      });

      const baseSelect = `
          *,
          host:hosts!experiences_host_id_fkey (
            id,
            name,
            bio,
            profile_photo_url:avatar_url,
            avg_rating,
            total_bookings,
            joined_at:created_at
          )
        `;

      let experience: any = null;
      let resolutionSource: 'experience_id' | 'experience_name' | null = null;

      // Fetch base experience with host info
      if (experience_id) {
        const { data: byId, error: byIdError } = await db
          .from('experiences')
          .select(baseSelect)
          .eq('id', experience_id)
          .eq('status', 'published')
          .is('deleted_at', null)
          .single();

        if (byIdError || !byId) {
          const { data: rawExperienceById } = await db
            .from('experiences')
            .select('id, title, status, deleted_at, type, city, region')
            .eq('id', experience_id)
            .maybeSingle();

          aiDebug('tool.getExperienceDetails', 'id_lookup_failed', {
            requestTraceId,
            experience_id,
            dbError: byIdError?.message || null,
            rawExperienceById,
          });
        } else {
          experience = byId;
          resolutionSource = 'experience_id';
        }
      }

      if (!experience && trimmedName.length > 0) {
        const { data: byName, error: byNameError } = await db
          .from('experiences')
          .select(baseSelect)
          .eq('status', 'published')
          .is('deleted_at', null)
          .ilike('title', `%${trimmedName}%`)
          .order('avg_rating', { ascending: false, nullsFirst: false })
          .order('reviews_count', { ascending: false, nullsFirst: false })
          .limit(5);

        if (byNameError || !byName || byName.length === 0) {
          aiDebug('tool.getExperienceDetails', 'name_lookup_failed', {
            requestTraceId,
            experience_name: trimmedName,
            dbError: byNameError?.message || null,
          });
        } else {
          experience = byName[0];
          resolutionSource = 'experience_name';
          aiDebug('tool.getExperienceDetails', 'name_lookup_resolved', {
            requestTraceId,
            experience_name: trimmedName,
            matchedExperienceId: experience.id,
            matchedExperienceTitle: experience.title,
            candidates: byName.map((item: any) => ({
              id: item.id,
              title: item.title,
            })),
          });
        }
      }

      if (!experience) {
        aiDebug('tool.getExperienceDetails', 'not_found', {
          requestTraceId,
          experience_id: experience_id || null,
          experience_name: trimmedName || null,
        });
        return {
          success: false,
          error: 'Experience not found',
        };
      }

      const resolvedExperienceId = experience.id as string;
      aiDebug('tool.getExperienceDetails', 'resolved_experience', {
        requestTraceId,
        resolvedExperienceId,
        title: experience.title,
        resolutionSource,
      });

      // Fetch amenities
      const { data: amenities } = await db
        .from('experience_amenities')
        .select(`
          amenity:amenities!experience_amenities_amenity_key_fkey (
            key,
            label_fr,
            category,
            icon
          )
        `)
        .eq('experience_id', resolvedExperienceId);

      // Fetch included services
      const { data: servicesIncluded } = await db
        .from('experience_services_included')
        .select(`
          service:services!experience_services_included_service_key_fkey (
            key,
            label_fr,
            category
          ),
          notes
        `)
        .eq('experience_id', resolvedExperienceId);

      // Fetch excluded services
      const { data: servicesExcluded } = await db
        .from('experience_services_excluded')
        .select(`
          service:services!experience_services_excluded_service_key_fkey (
            key,
            label_fr,
            category
          ),
          notes
        `)
        .eq('experience_id', resolvedExperienceId);

      // Fetch type-specific details
      let typeSpecificData: any = {};

      if (experience.type === 'lodging') {
        const { data: lodgingData } = await db
          .from('experiences_lodging')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .single();

        const { data: roomTypes } = await db
          .from('lodging_room_types')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .is('deleted_at', null)
          .order('price_cents', { ascending: true });

        typeSpecificData = {
          lodging: lodgingData,
          room_types: roomTypes?.map((rt: any) => ({
            id: rt.id,
            type: rt.room_type,
            name: rt.name,
            description: rt.description,
            capacity_beds: rt.capacity_beds,
            max_persons: rt.max_persons,
            price_mad: rt.price_cents / 100,
            equipments: rt.equipments,
            photos: rt.photos,
          })),
        };
      } else if (experience.type === 'trip') {
        const { data: tripData } = await db
          .from('experiences_trip')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .single();

        const { data: itinerary } = await db
          .from('trip_itinerary')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .order('day_number', { ascending: true })
          .order('order_index', { ascending: true });

        const { data: departures } = await db
          .from('trip_departures')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .eq('status', 'scheduled')
          .gte('depart_at', new Date().toISOString())
          .order('depart_at', { ascending: true })
          .limit(10);

        typeSpecificData = {
          trip: {
            ...tripData,
            price_mad: tripData?.price_cents ? tripData.price_cents / 100 : null,
          },
          itinerary: itinerary?.map((item: any) => ({
            day_number: item.day_number,
            title: item.title,
            details: item.details,
            location_name: item.location_name,
            duration_minutes: item.duration_minutes,
          })),
          upcoming_departures: departures?.map((dep: any) => ({
            id: dep.id,
            depart_at: dep.depart_at,
            return_at: dep.return_at,
            seats_available: dep.seats_available,
            seats_total: dep.seats_total,
            price_override_mad: dep.price_override_cents ? dep.price_override_cents / 100 : null,
          })),
        };
      } else if (experience.type === 'activity') {
        const { data: activityData } = await db
          .from('experiences_trip')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .single();

        const { data: sessions } = await db
          .from('activity_sessions')
          .select('*')
          .eq('experience_id', resolvedExperienceId)
          .eq('status', 'scheduled')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(10);

        typeSpecificData = {
          activity: {
            ...activityData,
            price_mad: activityData?.price_cents ? activityData.price_cents / 100 : null,
          },
          upcoming_sessions: sessions?.map((session: any) => ({
            id: session.id,
            start_at: session.start_at,
            end_at: session.end_at,
            capacity_available: session.capacity_available,
            capacity_total: session.capacity_total,
            price_override_mad: session.price_override_cents ? session.price_override_cents / 100 : null,
          })),
        };
      }

      // Fetch recent reviews (limit to 5 most recent)
      const { data: reviews } = await db
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user:profiles!reviews_user_id_fkey (
            id,
            full_name,
            profile_photo_url
          )
        `)
        .eq('experience_id', resolvedExperienceId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get active promotions
      const { data: promoInfo } = await db
        .rpc('experience_active_promos', { exp_id: resolvedExperienceId });

      const roomCount = Array.isArray(typeSpecificData.room_types)
        ? typeSpecificData.room_types.length
        : 0;
      const departureCount = Array.isArray(typeSpecificData.upcoming_departures)
        ? typeSpecificData.upcoming_departures.length
        : 0;
      const sessionCount = Array.isArray(typeSpecificData.upcoming_sessions)
        ? typeSpecificData.upcoming_sessions.length
        : 0;

      aiDebug('tool.getExperienceDetails', 'success', {
        requestTraceId,
        resolvedExperienceId,
        experienceType: experience.type,
        roomCount,
        departureCount,
        sessionCount,
        reviewCount: Array.isArray(reviews) ? reviews.length : 0,
      });

      return {
        success: true,
        resolved_with: resolutionSource,
        experience: {
          id: experience.id,
          title: experience.title,
          short_description: experience.short_description,
          long_description: experience.long_description,
          type: experience.type,
          city: experience.city,
          region: experience.region,
          location: experience.location,
          languages: experience.languages,
          cancellation_policy: experience.cancellation_policy,
          tags: experience.tags,
          avg_rating: experience.avg_rating,
          reviews_count: experience.reviews_count,
          bookings_count: experience.bookings_count,
          thumbnail_url: experience.thumbnail_url,
          video_id: experience.video_id,
        },
        host: experience.host,
        amenities: amenities?.map((a: any) => a.amenity) || [],
        services_included: servicesIncluded?.map((s: any) => ({ ...s.service, notes: s.notes })) || [],
        services_excluded: servicesExcluded?.map((s: any) => ({ ...s.service, notes: s.notes })) || [],
        ...typeSpecificData,
        recent_reviews: reviews || [],
        promotion_info: promoInfo?.[0] || {
          has_promo: false,
          promo_count: 0,
          auto_apply_available: false,
        },
      };
    } catch (error) {
      aiDebug('tool.getExperienceDetails', 'exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('Get experience details error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
