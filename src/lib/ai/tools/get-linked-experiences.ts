import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const getLinkedExperiencesSchema = z.object({
  experience_id: z.string().uuid().describe('UUID of the experience to get linked experiences for'),
});

export const getLinkedExperiences = tool({
  description: `Get experiences linked to a specific experience.
Linked experiences are related offerings that complement the main experience.
For example: a lodge may be linked to nearby activities/treks, an activity may be linked to lodging.
Use this when user shows interest in an experience to suggest complementary options.`,
  inputSchema: getLinkedExperiencesSchema,
  execute: async ({ experience_id }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      // Get linked experiences (where source is the given experience)
      const { data: links, error: linksError } = await db
        .from('experience_links')
        .select(`
          target_experience_id,
          target:experiences!target_experience_id (
            id,
            title,
            type,
            city,
            region,
            short_description,
            price_cents,
            avg_rating,
            reviews_count,
            published,
            thumbnail_url
          )
        `)
        .eq('source_experience_id', experience_id);

      if (linksError) {
        console.error('Get linked experiences error:', linksError);
        return {
          success: false,
          error: linksError.message,
        };
      }

      // Filter out unpublished experiences and format
      const linkedExperiences = (links || [])
        .filter((link: any) => link.target?.published)
        .map((link: any) => ({
          id: link.target.id,
          title: link.target.title,
          type: link.target.type,
          city: link.target.city,
          region: link.target.region,
          description: link.target.short_description,
          price_mad: link.target.price_cents ? link.target.price_cents / 100 : null,
          rating: link.target.avg_rating,
          reviews_count: link.target.reviews_count,
          thumbnail_url: link.target.thumbnail_url,
        }));

      // Also get room types for lodging experiences
      const lodgingIds = linkedExperiences
        .filter((exp: any) => exp.type === 'lodging')
        .map((exp: any) => exp.id);

      if (lodgingIds.length > 0) {
        const { data: rooms } = await db
          .from('lodging_room_types')
          .select('experience_id, name, room_type, price_cents, capacity_beds, max_persons')
          .in('experience_id', lodgingIds)
          .is('deleted_at', null)
          .order('price_cents', { ascending: true });

        if (rooms) {
          const roomsByExp: Record<string, any[]> = {};
          for (const r of rooms) {
            if (!roomsByExp[r.experience_id]) roomsByExp[r.experience_id] = [];
            roomsByExp[r.experience_id].push({
              name: r.name || r.room_type,
              type: r.room_type,
              price_mad: r.price_cents ? r.price_cents / 100 : 0,
              capacity_beds: r.capacity_beds,
              max_persons: r.max_persons,
            });
          }
          for (const exp of linkedExperiences) {
            if (roomsByExp[exp.id]) {
              exp.rooms = roomsByExp[exp.id];
            }
          }
        }
      }

      return {
        success: true,
        count: linkedExperiences.length,
        linked_experiences: linkedExperiences,
      };
    } catch (error) {
      console.error('Get linked experiences error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
