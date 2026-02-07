import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedQuery } from '@/lib/embeddings';

const searchExperiencesSchema = z.object({
  query: z.string().describe('Search query from user in natural language'),
  type: z.enum(['lodging', 'trip', 'activity']).optional().describe('Type of experience to search for'),
  city: z.string().optional().describe('Filter by city name'),
  region: z.string().optional().describe('Filter by region name'),
  max_price_mad: z.number().optional().describe('Maximum price in MAD (Moroccan Dirham)'),
  min_rating: z.number().min(0).max(5).optional().describe('Minimum average rating (0-5)'),
  guests: z.number().optional().describe('Number of guests/participants'),
  date_from: z.string().optional().describe('Check-in date or activity date (YYYY-MM-DD format)'),
  date_to: z.string().optional().describe('Check-out date (YYYY-MM-DD format, for lodging)'),
  user_lat: z.number().optional().describe('User latitude for distance-based search'),
  user_lng: z.number().optional().describe('User longitude for distance-based search'),
  max_distance_km: z.number().optional().describe('Maximum distance in kilometers from user location'),
  sort_by_distance: z.boolean().optional().describe('Sort results by distance from user'),
  only_with_promo: z.boolean().optional().describe('Only show experiences with active promotions'),
  only_auto_apply: z.boolean().optional().describe('Only show experiences with auto-apply promotions'),
  limit: z.number().optional().default(10).describe('Maximum number of results to return'),
});

export const searchExperiences = tool({
  description: `Search for experiences (lodging, trips, activities) in Morocco using semantic search.
This tool combines AI-powered semantic search with filters like location, price, dates, and promotions.
Use this when users ask to find, search, or discover experiences.`,
  inputSchema: searchExperiencesSchema,
  execute: async (params) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      // Generate embedding for the search query
      const queryEmbedding = await embedQuery(params.query);

      // Convert price from MAD to cents if provided
      const maxPriceCents = params.max_price_mad ? params.max_price_mad * 100 : null;

      // Determine sort order
      let sortBy = 'relevance';
      if (params.sort_by_distance && params.user_lat && params.user_lng) {
        sortBy = 'distance';
      } else if (params.only_with_promo || params.only_auto_apply) {
        sortBy = 'promo_priority';
      }

      // Call the enhanced search function
      const { data: results, error } = await db.rpc('search_experiences_enhanced', {
        query_embedding: JSON.stringify(queryEmbedding),
        semantic_threshold: 0.7,
        text_query: params.query,
        exp_type: params.type || null,
        city_filter: params.city || null,
        region_filter: params.region || null,
        price_min_cents: null,
        price_max_cents: maxPriceCents,
        min_rating: params.min_rating || null,
        min_guests: params.guests || null,
        date_from: params.date_from || null,
        date_to: params.date_to || null,
        check_availability: !!(params.date_from),
        user_lat: params.user_lat || null,
        user_lng: params.user_lng || null,
        max_distance_km: params.max_distance_km || null,
        only_with_promo: params.only_with_promo || false,
        only_auto_apply: params.only_auto_apply || false,
        sort_by: sortBy,
        result_limit: params.limit || 10,
        result_offset: 0,
      });

      if (error) {
        console.error('Search error:', error);
        return {
          success: false,
          error: error.message,
          results: [],
        };
      }

      // Format results for AI
      const formattedResults = results?.map((exp: any) => ({
        id: exp.id,
        title: exp.title,
        description: exp.short_description,
        type: exp.type,
        city: exp.city,
        region: exp.region,
        price_mad: exp.price_cents ? exp.price_cents / 100 : null,
        rating: exp.avg_rating,
        reviews_count: exp.reviews_count,
        distance_km: exp.distance_km,
        has_promo: exp.has_promo,
        promo_badge: exp.promo_badge,
        promo_type: exp.promo_discount_type,
        promo_value: exp.promo_discount_value,
        auto_apply_promo: exp.auto_apply_promo,
        is_available: exp.is_available,
        host_name: exp.host_name,
        thumbnail_url: exp.thumbnail_url,
      })) || [];

      return {
        success: true,
        count: formattedResults.length,
        results: formattedResults,
        has_more: formattedResults.length >= (params.limit || 10),
      };
    } catch (error) {
      console.error('Search experiences error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
      };
    }
  },
});
