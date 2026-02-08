import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { resolveStorageUrl } from '@/utils/functions';
import type { ExperienceListItem, ExperienceSort, ExperienceType } from '@/types/experience';

interface FetchExperiencesParams {
  type?: ExperienceType;
  search?: string;
  limit?: number;
  featured?: boolean;
  sort?: ExperienceSort;
  offset?: number;
  priceMin?: number;
  priceMax?: number;
}

const SORT_DEFAULT: ExperienceSort = 'newest';

function applySort(
  query: any,
  sort: ExperienceSort,
) {
  switch (sort) {
    case 'popular':
      return query.order('bookings_count', { ascending: false, nullsFirst: false });
    case 'rating':
      return query.order('avg_rating', { ascending: false, nullsFirst: false });
    case 'price_high':
    case 'price_low':
      return query.order('created_at', { ascending: false });
    case 'newest':
    default:
      return query.order('created_at', { ascending: false });
  }
}

async function fetchExperiences(params: FetchExperiencesParams = {}): Promise<ExperienceListItem[]> {
  const supabase = createClient();
  const {
    type,
    search,
    limit = 20,
    featured,
    sort = SORT_DEFAULT,
    offset = 0,
    priceMin,
    priceMax,
  } = params;

  const baseFields = `
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
      )`;

  let query = supabase
    .from('experiences')
    .select(baseFields)
    .eq('status', 'published')
    .is('deleted_at', null);

  if (type) {
    query = query.eq('type', type);
  }

  if (search) {
    const hasArabic = /[\u0600-\u06FF]/.test(search);
    const hasEnglish = /^[a-zA-Z0-9\s]+$/.test(search);

    let searchColumn = 'search_vector_fr';
    let config: 'french' | 'english' | 'arabic' = 'french';

    if (hasArabic) {
      searchColumn = 'search_vector_ar';
      config = 'arabic';
    } else if (hasEnglish) {
      searchColumn = 'search_vector_en';
      config = 'english';
    }

    query = query.or(`${searchColumn}.wfts(${config}).${search},title.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  if (featured) {
    query = query
      .order('avg_rating', { ascending: false, nullsFirst: false })
      .order('bookings_count', { ascending: false, nullsFirst: false });
  } else if (search) {
    query = applySort(query, sort);
  } else {
    query = applySort(query, sort);
  }

  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.range(0, limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || [])
    .map((exp: any) => {
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
      const priceCents = tripData?.price_cents || minRoomPrice?.price_cents || null;

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
        _priceCents: priceCents,
      };
    })
    .filter((exp: any) => {
      if (priceMin != null && exp._priceCents != null && exp._priceCents < priceMin * 100) {
        return false;
      }
      if (priceMax != null && exp._priceCents != null && exp._priceCents > priceMax * 100) {
        return false;
      }
      return true;
    })
    .map(({ _priceCents, ...exp }: any) => exp);
}

export function useExperiences(params: FetchExperiencesParams = {}) {
  return useQuery({
    queryKey: ['experiences', params],
    queryFn: () => fetchExperiences(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInfiniteExperiences(
  params: Omit<FetchExperiencesParams, 'limit' | 'offset'> & { pageSize?: number } = {},
  enabled = true,
) {
  const { pageSize = 12, ...rest } = params;

  return useInfiniteQuery({
    queryKey: ['experiences-infinite', rest, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const items = await fetchExperiences({
        ...rest,
        limit: pageSize,
        offset: pageParam * pageSize,
      });

      return {
        items,
        page: pageParam,
        hasMore: items.length === pageSize,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 1000 * 60 * 5,
    enabled,
  });
}
