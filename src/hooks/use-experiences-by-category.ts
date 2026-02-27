import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ExperienceListItem } from "@/types/experience";
import { resolveStorageUrl } from "@/utils/functions";

interface ExperiencesByCategory {
  categoryId: string;
  categoryTitle: string;
  categoryAsset: string | null;
  experiences: ExperienceListItem[];
}

type RoomListItem = NonNullable<ExperienceListItem["rooms"]>[number];

function transformExperience(exp: any): ExperienceListItem {
  // Extract lodging data and calculate minimum room price
  const lodgingData = Array.isArray(exp.lodging)
    ? exp.lodging[0] || null
    : exp.lodging;
  const rooms = Array.isArray(exp.rooms) ? exp.rooms : [];
  const mappedRooms: RoomListItem[] = rooms
    .map((room: any) => ({
      id: room.id,
      name: room.name ?? null,
      price_cents: room.price_cents ?? null,
      currency: room.currency ?? null,
      max_persons: room.max_persons ?? null,
      total_rooms: room.total_rooms ?? null,
      photo_urls: Array.isArray(room.photos)
        ? room.photos
            .map((path: string) => resolveStorageUrl(path))
            .filter((url: string | null): url is string => Boolean(url))
        : [],
    }))
    .sort(
      (a: { price_cents: number | null }, b: { price_cents: number | null }) =>
        (a.price_cents ?? Number.MAX_SAFE_INTEGER) -
        (b.price_cents ?? Number.MAX_SAFE_INTEGER),
    );
  const minRoomPrice =
    mappedRooms.length > 0
      ? mappedRooms.reduce<RoomListItem | null>((min, room) => {
          const roomPrice = room.price_cents ?? Number.MAX_SAFE_INTEGER;
          const minPrice = min?.price_cents ?? Number.MAX_SAFE_INTEGER;
          if (!min || roomPrice < minPrice) {
            return room;
          }
          return min;
        }, null)
      : null;

  const tripData = Array.isArray(exp.trip) ? exp.trip[0] || null : exp.trip;
  const videoData = Array.isArray(exp.video) ? exp.video[0] || null : exp.video;
  const videoBucket = videoData?.bucket || "media";
  const videoUrl = videoData?.path
    ? resolveStorageUrl(videoData.path, videoBucket)
    : null;
  const videoHlsUrl = videoData?.hls_playlist_url
    ? resolveStorageUrl(videoData.hls_playlist_url, videoBucket)
    : null;
  const thumbnailUrl = resolveStorageUrl(exp.thumbnail_url);

  return {
    id: exp.id,
    title: exp.title,
    short_description: exp.short_description,
    city: exp.city,
    region: exp.region,
    type: exp.type,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
    video_hls_url: videoHlsUrl,
    rooms: mappedRooms,
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

export function useExperiencesByCategory(
  categoryId: string | null,
  limit?: number,
) {
  return useQuery<ExperienceListItem[]>({
    queryKey: ["experiences-by-category", categoryId, limit ?? "all"],
    queryFn: async () => {
      if (!categoryId) return [];

      const supabase = createClient();

      let query = (supabase as any)
        .from("experience_categories")
        .select(`
          experience:experiences!inner(
            id,
            title,
            short_description,
            city,
            region,
            type,
            thumbnail_url,
            video:media_assets!fk_experiences_video(
              path,
              hls_playlist_url,
              bucket
            ),
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
              id,
              name,
              price_cents,
              currency,
              max_persons,
              total_rooms,
              photos
            )
          )
        `)
        .eq("category_id", categoryId)
        .eq("experience.status", "published")
        .is("experience.deleted_at", null);

      if (typeof limit === "number" && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[useExperiencesByCategory] Error:", error);
        throw error;
      }

      // Transform the data
      return (data || []).map((item: any) =>
        transformExperience(item.experience),
      );
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllCategoryGroups(limitPerCategory = 10) {
  return useQuery<ExperiencesByCategory[]>({
    queryKey: ["all-category-groups", limitPerCategory],
    queryFn: async () => {
      const supabase = createClient();

      // First get all active categories that have experiences
      const { data: categories, error: categoriesError } = await (
        supabase as any
      )
        .from("categories")
        .select(`
          id,
          title,
          asset,
          experience_categories!inner(
            experience:experiences!inner(id)
          )
        `)
        .eq("is_active", true)
        .eq("experience_categories.experiences.status", "published")
        .limit(6);

      if (categoriesError) {
        console.error(
          "[useAllCategoryGroups] Categories error:",
          categoriesError,
        );
        throw categoriesError;
      }

      // For each category, fetch its experiences
      const results: ExperiencesByCategory[] = [];

      for (const category of categories || []) {
        const { data: expData, error: expError } = await (supabase as any)
          .from("experience_categories")
          .select(`
            experience:experiences!inner(
              id,
              title,
              short_description,
              city,
              region,
              type,
              thumbnail_url,
              video:media_assets!fk_experiences_video(
                path,
                hls_playlist_url,
                bucket
              ),
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
                id,
                name,
                price_cents,
                currency,
                max_persons,
                total_rooms,
                photos
              )
            )
          `)
          .eq("category_id", category.id)
          .eq("experience.status", "published")
          .is("experience.deleted_at", null)
          .limit(limitPerCategory);

        if (expError) {
          console.error(
            `[useAllCategoryGroups] Error fetching experiences for ${category.id}:`,
            expError,
          );
          continue;
        }

        const experiences: ExperienceListItem[] = (expData || []).map(
          (item: any) => transformExperience(item.experience),
        );

        if (experiences.length > 0) {
          results.push({
            categoryId: category.id,
            categoryTitle:
              category.title?.fr || category.title?.en || "Category",
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
