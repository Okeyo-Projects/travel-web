import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const findSimilarSchema = z.object({
  experience_id: z.string().uuid().describe('UUID of the reference experience'),
  same_region: z.boolean().optional().describe('Only find experiences in the same region'),
  same_type: z.boolean().optional().describe('Only find experiences of the same type'),
  limit: z.number().optional().default(5).describe('Maximum number of similar experiences to return'),
});

export const findSimilar = tool({
  description: `Find similar experiences based on semantic similarity using vector embeddings.
Useful when users ask for alternatives or similar options to a specific experience.`,
  inputSchema: findSimilarSchema,
  execute: async (params: z.infer<typeof findSimilarSchema>) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      // Get the reference experience with its embedding
      const { data: refExperience, error: refError } = await db
        .from('experiences')
        .select('id, title, type, region, city, embedding')
        .eq('id', params.experience_id)
        .single();

      if (refError || !refExperience || !refExperience.embedding) {
        return {
          success: false,
          error: 'Reference experience not found or has no embedding',
        };
      }

      // Search for similar experiences using the reference embedding
      const { data: results, error } = await db.rpc('search_experiences_enhanced', {
        query_embedding: refExperience.embedding,
        semantic_threshold: 0.75,
        text_query: null,
        exp_type: params.same_type ? refExperience.type : null,
        city_filter: null,
        region_filter: params.same_region ? refExperience.region : null,
        price_min_cents: null,
        price_max_cents: null,
        min_rating: null,
        min_guests: null,
        date_from: null,
        date_to: null,
        check_availability: false,
        user_lat: null,
        user_lng: null,
        max_distance_km: null,
        only_with_promo: false,
        only_auto_apply: false,
        sort_by: 'relevance',
        result_limit: params.limit + 1, // +1 to account for the reference itself
        result_offset: 0,
      });

      if (error) {
        console.error('Find similar error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Filter out the reference experience itself and format results
      const similarExperiences = results
        ?.filter((exp: any) => exp.id !== params.experience_id)
        .slice(0, params.limit)
        .map((exp: any) => ({
          id: exp.id,
          title: exp.title,
          description: exp.short_description,
          type: exp.type,
          city: exp.city,
          region: exp.region,
          price_mad: exp.price_cents ? exp.price_cents / 100 : null,
          rating: exp.avg_rating,
          reviews_count: exp.reviews_count,
          similarity_score: exp.relevance_score,
          has_promo: exp.has_promo,
          promo_badge: exp.promo_badge,
          thumbnail_url: exp.thumbnail_url,
          host_name: exp.host_name,
        })) || [];

      return {
        success: true,
        reference: {
          id: refExperience.id,
          title: refExperience.title,
          type: refExperience.type,
          region: refExperience.region,
          city: refExperience.city,
        },
        similar_experiences: similarExperiences,
        count: similarExperiences.length,
      };
    } catch (error) {
      console.error('Find similar error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
