import { useQuery } from "@tanstack/react-query";
import { type AppLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { resolveLocalizedTitle } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/client";
import type { ExperienceListItem } from "@/types/experience";
import { resolveStorageUrl } from "@/utils/functions";

interface ExperiencesByCategory {
  categoryId: string;
  categorySlug: string | null;
  categoryTitle: string;
  categoryAsset: string | null;
  experiences: ExperienceListItem[];
}

type RoomListItem = NonNullable<ExperienceListItem["rooms"]>[number];
type LocalizedCategoryTitle =
  | string
  | {
      fr?: string | null;
      en?: string | null;
      ar?: string | null;
    };

type RawRoom = {
  id: string;
  name?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  max_persons?: number | null;
  total_rooms?: number | null;
  photos?: string[] | null;
};

type RawVideo = {
  path?: string | null;
  hls_playlist_url?: string | null;
  bucket?: string | null;
};

type RawHost = {
  id: string;
  name: string;
  avatar_url?: string | null;
  verified?: boolean | null;
};

type RawTrip = NonNullable<ExperienceListItem["trip"]>;
type RawLodging = Pick<
  NonNullable<ExperienceListItem["lodging"]>,
  "min_stay_nights"
>;

type RawExperience = {
  id: string;
  title: string;
  short_description: string;
  city: string;
  region: string | null;
  type: ExperienceListItem["type"];
  thumbnail_url?: string | null;
  avg_rating: number | null;
  reviews_count: number | null;
  host?: RawHost | null;
  trip?: RawTrip | RawTrip[] | null;
  lodging?: RawLodging | RawLodging[] | null;
  rooms?: RawRoom[] | null;
  video?: RawVideo | RawVideo[] | null;
};

type ExperienceCategoryRow = {
  experience: RawExperience;
};

type CategoryGroupRow = {
  id: string;
  title: LocalizedCategoryTitle | null;
  slug: string | null;
  asset: string | null;
};

export function transformExperience(exp: RawExperience): ExperienceListItem {
  // Extract lodging data and calculate minimum room price
  const lodgingData = Array.isArray(exp.lodging)
    ? exp.lodging[0] || null
    : (exp.lodging ?? null);
  const rooms = Array.isArray(exp.rooms) ? exp.rooms : [];
  const mappedRooms: RoomListItem[] = rooms
    .map((room) => ({
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

  const tripData = Array.isArray(exp.trip)
    ? exp.trip[0] || null
    : (exp.trip ?? null);
  const videoData = Array.isArray(exp.video)
    ? exp.video[0] || null
    : (exp.video ?? null);
  const videoBucket = videoData?.bucket || "media";
  const videoUrl = videoData?.path
    ? resolveStorageUrl(videoData.path ?? null, videoBucket)
    : null;
  const videoHlsUrl = videoData?.hls_playlist_url
    ? resolveStorageUrl(videoData.hls_playlist_url ?? null, videoBucket)
    : null;
  const thumbnailUrl = resolveStorageUrl(exp.thumbnail_url ?? null);

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
          avatar_url: resolveStorageUrl(exp.host.avatar_url ?? null),
          verified: exp.host.verified ?? null,
        }
      : null,
    trip: tripData ?? null,
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

      let query = supabase
        .from("experience_categories" as never)
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
        .eq("category_id" as never, categoryId)
        .eq("experience.status" as never, "published")
        .is("experience.deleted_at" as never, null);

      if (typeof limit === "number" && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[useExperiencesByCategory] Error:", error);
        throw error;
      }

      // Transform the data
      return ((data || []) as ExperienceCategoryRow[]).map((item) =>
        transformExperience(item.experience),
      );
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllCategoryGroups(
  limitPerCategory = 10,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  return useQuery<ExperiencesByCategory[]>({
    queryKey: ["all-category-groups", limitPerCategory, locale],
    queryFn: async () => {
      const supabase = createClient();

      const { data: allCategories, error: categoriesError } = await supabase
        .from("categories" as never)
        .select("*")
        .eq("is_active" as never, true)
        .order("created_at" as never, { ascending: false });

      if (categoriesError) {
        console.error(
          "[useAllCategoryGroups] Categories error:",
          categoriesError,
        );
        throw categoriesError;
      }

      const { data: usedCategoriesData, error: usedCategoriesError } =
        await supabase
          .from("experience_categories" as never)
          .select(`
            category_id,
            experience:experiences!inner(id, status, deleted_at)
          `)
          .eq("experience.status" as never, "published")
          .is("experience.deleted_at" as never, null);

      if (usedCategoriesError) {
        console.error(
          "[useAllCategoryGroups] Used categories error:",
          usedCategoriesError,
        );
        throw usedCategoriesError;
      }

      const experienceCountByCategory = new Map<string, number>();

      for (const item of (usedCategoriesData ?? []) as Array<{
        category_id: string;
      }>) {
        experienceCountByCategory.set(
          item.category_id,
          (experienceCountByCategory.get(item.category_id) ?? 0) + 1,
        );
      }

      const categories = ((allCategories ?? []) as CategoryGroupRow[])
        .filter((category) => experienceCountByCategory.has(category.id))
        .sort(
          (a, b) =>
            (experienceCountByCategory.get(b.id) ?? 0) -
            (experienceCountByCategory.get(a.id) ?? 0),
        );

      // For each category, fetch its experiences
      const results: ExperiencesByCategory[] = [];

      for (const category of categories) {
        const { data: expData, error: expError } = await supabase
          .from("experience_categories" as never)
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
          .eq("category_id" as never, category.id)
          .eq("experience.status" as never, "published")
          .is("experience.deleted_at" as never, null)
          .limit(limitPerCategory);

        if (expError) {
          console.error(
            `[useAllCategoryGroups] Error fetching experiences for ${category.id}:`,
            expError,
          );
          continue;
        }

        const experiences: ExperienceListItem[] = (
          (expData || []) as ExperienceCategoryRow[]
        ).map((item) => transformExperience(item.experience));

        if (experiences.length > 0) {
          results.push({
            categoryId: category.id,
            categorySlug: category.slug,
            categoryTitle:
              resolveLocalizedTitle(category.title, locale) || "Category",
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
