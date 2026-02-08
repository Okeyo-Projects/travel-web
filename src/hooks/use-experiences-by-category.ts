import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ExperienceListItem } from '@/types/experience';
import { resolveStorageUrl } from '@/utils/functions';

interface ExperiencesByCategory {
  categoryId: string;
  categoryTitle: string;
  categoryAsset: string | null;
  experiences: ExperienceListItem[];
}

function transformExperience(exp: any): ExperienceListItem {
  // Extract lodging data and calculate minimum room price
  const lodgingData = Array.isArray(exp.lodging) ? exp.lodging[0] || null : exp.lodging;
  const rooms = exp.rooms || [];
  const minRoomPrice = rooms.length > 0
    ? rooms.reduce((min: any, room: any) => {
        if (!min || (room.price_cents && room.price_cents < min.price_cents)) {
          return room;
        }
        return min;
      }, null)
    : null;

  const tripData = Array.isArray(exp.trip) ? exp.trip[0] || null : exp.trip;

  return {
    id: exp.id,
    title: exp.title,
    short_description: exp.short_description,
    city: exp.city,
    region: exp.region,
    type: exp.type,
    thumbnail_url: resolveStorageUrl(exp.thumbnail_url),
    avg_rating: exp.avg_rating,
    reviews_count: exp.reviews_count,
    host: exp.host
      ? {
          ...exp.host,
          avatar_url: resolveStorageUrl(exp.host.avatar_url),
        }
      : null,
    trip: tripData,
    lodging: lodgingData
      ? {
          ...lodgingData,
          price_cents: minRoomPrice?.price_cents || null,
          currency: minRoomPrice?.currency || null,
        }
      : null,
  };
}

export function useExperiencesByCategory(categoryId: string | null, limit = 10) {
  return useQuery<ExperienceListItem[]>({
    queryKey: ['experiences-by-category', categoryId, limit],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const supabase = createClient();
      
      const { data, error } = await (supabase as any)
        .from('experience_categories')
        .select(`
          experience:experiences!inner(
            id,
            title,
            short_description,
            city,
            region,
            type,
            thumbnail_url,
            avg_rating,
            reviews_count,
            host:hosts!experiences_host_id_fkey(
              id,
              name,
              avatar_url,
              verified
            ),
            trip:experiences_trip!experiences_trip_experience_id_fkey(
              price_cents,
              currency,
              duration_days,
              duration_hours
            ),
            lodging:experiences_lodging!experiences_lodging_experience_id_fkey(
              min_stay_nights
            ),
            rooms:lodging_room_types(
              price_cents,
              currency
            )
          )
        `)
        .eq('category_id', categoryId)
        .eq('experience.status', 'published')
        .is('experience.deleted_at', null)
        .limit(limit);

      if (error) {
        console.error('[useExperiencesByCategory] Error:', error);
        throw error;
      }

      // Transform the data
      return (data || []).map((item: any) => transformExperience(item.experience));
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllCategoryGroups(limitPerCategory = 10) {
  return useQuery<ExperiencesByCategory[]>({
    queryKey: ['all-category-groups', limitPerCategory],
    queryFn: async () => {
      const supabase = createClient();
      
      // First get all active categories that have experiences
      const { data: categories, error: categoriesError } = await (supabase as any)
        .from('categories')
        .select(`
          id,
          title,
          asset,
          experience_categories!inner(
            experience:experiences!inner(id)
          )
        `)
        .eq('is_active', true)
        .eq('experience_categories.experiences.status', 'published')
        .limit(6);

      if (categoriesError) {
        console.error('[useAllCategoryGroups] Categories error:', categoriesError);
        throw categoriesError;
      }

      // For each category, fetch its experiences
      const results: ExperiencesByCategory[] = [];
      
      for (const category of (categories || [])) {
        const { data: expData, error: expError } = await (supabase as any)
          .from('experience_categories')
          .select(`
            experience:experiences!inner(
              id,
              title,
              short_description,
              city,
              region,
              type,
              thumbnail_url,
              avg_rating,
              reviews_count,
              host:hosts!experiences_host_id_fkey(
                id,
                name,
                avatar_url,
                verified
              ),
              trip:experiences_trip!experiences_trip_experience_id_fkey(
                price_cents,
                currency,
                duration_days,
                duration_hours
              ),
              lodging:experiences_lodging!experiences_lodging_experience_id_fkey(
                min_stay_nights
              ),
              rooms:lodging_room_types(
                price_cents,
                currency
              )
            )
          `)
          .eq('category_id', category.id)
          .eq('experience.status', 'published')
          .is('experience.deleted_at', null)
          .limit(limitPerCategory);

        if (expError) {
          console.error(`[useAllCategoryGroups] Error fetching experiences for ${category.id}:`, expError);
          continue;
        }

        const experiences: ExperienceListItem[] = (expData || []).map((item: any) => 
          transformExperience(item.experience)
        );

        if (experiences.length > 0) {
          results.push({
            categoryId: category.id,
            categoryTitle: category.title?.fr || category.title?.en || 'Category',
            categoryAsset: category.asset,
            experiences,
          });
        }
      }

      return results;
    },
    staleTime: 1000 * 60 * 5,
  });
}
