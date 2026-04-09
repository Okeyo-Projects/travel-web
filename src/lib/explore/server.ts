import { type AppLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { resolveLocalizedTitle } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";
import type {
  ExperienceListItem,
  ExperienceSort,
  ExperienceType,
} from "@/types/experience";
import { resolveStorageUrl } from "@/utils/functions";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RoomListItem = NonNullable<ExperienceListItem["rooms"]>[number];

type QueryWithOrder<T> = {
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => T;
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

type RawExperience = {
  id: string;
  title: string;
  short_description: string;
  city: string;
  region: string | null;
  type: ExperienceType;
  thumbnail_url?: string | null;
  video?:
    | Array<{
        path?: string | null;
        hls_playlist_url?: string | null;
        bucket?: string | null;
      }>
    | {
        path?: string | null;
        hls_playlist_url?: string | null;
        bucket?: string | null;
      }
    | null;
  avg_rating: number | null;
  reviews_count: number | null;
  host?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    verified?: boolean | null;
  } | null;
  trip?:
    | Array<{
        price_cents: number | null;
        currency: string | null;
        duration_days: number | null;
        duration_hours: number | null;
      }>
    | {
        price_cents: number | null;
        currency: string | null;
        duration_days: number | null;
        duration_hours: number | null;
      }
    | null;
  lodging?:
    | Array<{
        min_stay_nights: number | null;
      }>
    | {
        min_stay_nights: number | null;
      }
    | null;
  rooms?: RawRoom[] | null;
};

type ExploreExperienceWithMeta = ExperienceListItem & {
  _priceCents: number | null;
  _roomTypes: Array<{
    id: string;
    max_persons: number | null;
    total_rooms: number | null;
  }>;
};

export interface ExploreCategoryGroup {
  categoryId: string;
  categorySlug: string | null;
  categoryTitle: string;
  categoryAsset: string | null;
  experiences: ExperienceListItem[];
}

export interface ExploreSearchInput {
  type?: ExperienceType;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: ExperienceSort;
  priceMin?: number;
  priceMax?: number;
  guests?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExploreSearchResult {
  items: ExperienceListItem[];
  fetchedCount: number;
}

const SORT_DEFAULT: ExperienceSort = "newest";

const EXPERIENCE_LIST_SELECT = `
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
`;

function parseDateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = parseDateOnly(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

function enumerateDateRange(
  startIso: string,
  endIsoExclusive: string,
): string[] {
  const dates: string[] = [];
  let cursor = parseDateOnly(startIso);
  const end = parseDateOnly(endIsoExclusive);

  while (cursor < end) {
    dates.push(formatDateOnly(cursor));
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function isValidIsoDate(value: string | undefined | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function applySort<T extends QueryWithOrder<T>>(
  query: T,
  sort: ExperienceSort,
) {
  switch (sort) {
    case "popular":
      return query.order("bookings_count", {
        ascending: false,
        nullsFirst: false,
      });
    case "rating":
      return query.order("avg_rating", { ascending: false, nullsFirst: false });
    case "price_high":
    case "price_low":
      return query.order("created_at", { ascending: false });
    default:
      return query.order("created_at", { ascending: false });
  }
}

function mapExperienceWithMeta(exp: RawExperience): ExploreExperienceWithMeta {
  const lodgingData = Array.isArray(exp.lodging)
    ? (exp.lodging[0] ?? null)
    : (exp.lodging ?? null);
  const rooms = Array.isArray(exp.rooms) ? exp.rooms : [];
  const mappedRooms: RoomListItem[] = rooms
    .map((room: RawRoom) => ({
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
          return !min || roomPrice < minPrice ? room : min;
        }, null)
      : null;

  const tripData = Array.isArray(exp.trip)
    ? (exp.trip[0] ?? null)
    : (exp.trip ?? null);
  const videoData = Array.isArray(exp.video)
    ? (exp.video[0] ?? null)
    : (exp.video ?? null);
  const videoBucket = videoData?.bucket || "media";
  const videoUrl = videoData?.path
    ? resolveStorageUrl(videoData.path, videoBucket)
    : null;
  const videoHlsUrl = videoData?.hls_playlist_url
    ? resolveStorageUrl(videoData.hls_playlist_url, videoBucket)
    : null;
  const thumbnailUrl = resolveStorageUrl(exp.thumbnail_url ?? null);
  const priceCents = tripData?.price_cents || minRoomPrice?.price_cents || null;
  const host = exp.host
    ? {
        ...exp.host,
        avatar_url: resolveStorageUrl(exp.host.avatar_url ?? null),
        verified: exp.host.verified ?? null,
      }
    : null;

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
    host,
    trip: tripData,
    lodging: lodgingData
      ? {
          ...lodgingData,
          price_cents: minRoomPrice?.price_cents || null,
          currency: minRoomPrice?.currency || null,
        }
      : null,
    _priceCents: priceCents,
    _roomTypes: rooms.map((room: RawRoom) => ({
      id: room.id,
      max_persons: room.max_persons ?? null,
      total_rooms: room.total_rooms ?? null,
    })),
  };
}

async function applyAvailabilityFilters(
  supabase: SupabaseClient,
  items: ExploreExperienceWithMeta[],
  guests?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<ExploreExperienceWithMeta[]> {
  const minGuests = guests && guests > 0 ? guests : undefined;
  const hasDateFilter = isValidIsoDate(dateFrom);
  const shouldFilterAvailability = Boolean(minGuests || hasDateFilter);

  if (!shouldFilterAvailability || items.length === 0) {
    return items;
  }

  const availableExperienceIds = new Set<string>();

  const tripItems = items.filter((item) => item.type === "trip");
  const tripExperienceIds = tripItems.map((item) => item.id);

  if (tripExperienceIds.length > 0) {
    let tripQuery = supabase
      .from("trip_departures")
      .select("experience_id, seats_available, depart_at")
      .in("experience_id", tripExperienceIds)
      .eq("status", "scheduled");

    if (hasDateFilter && dateFrom) {
      tripQuery = tripQuery.gte("depart_at", `${dateFrom}T00:00:00`);
      const endDateInclusive = isValidIsoDate(dateTo) ? dateTo : dateFrom;
      const endDateExclusive = addDaysToIsoDate(endDateInclusive, 1);
      tripQuery = tripQuery.lt("depart_at", `${endDateExclusive}T00:00:00`);
    } else {
      tripQuery = tripQuery.gte("depart_at", new Date().toISOString());
    }

    const { data: tripDepartures, error: tripError } = await tripQuery;
    if (tripError) {
      throw tripError;
    }

    for (const departure of tripDepartures || []) {
      const seatsAvailable =
        typeof departure.seats_available === "number"
          ? departure.seats_available
          : 0;
      if (seatsAvailable > 0 && (!minGuests || seatsAvailable >= minGuests)) {
        availableExperienceIds.add(departure.experience_id);
      }
    }
  }

  const activityItems = items.filter((item) => item.type === "activity");
  const activityExperienceIds = activityItems.map((item) => item.id);

  if (activityExperienceIds.length > 0) {
    let activityQuery = supabase
      .from("activity_sessions")
      .select("experience_id, capacity_available, start_at")
      .in("experience_id", activityExperienceIds)
      .eq("status", "scheduled");

    if (hasDateFilter && dateFrom) {
      activityQuery = activityQuery.gte("start_at", `${dateFrom}T00:00:00`);
      const endDateInclusive = isValidIsoDate(dateTo) ? dateTo : dateFrom;
      const endDateExclusive = addDaysToIsoDate(endDateInclusive, 1);
      activityQuery = activityQuery.lt(
        "start_at",
        `${endDateExclusive}T00:00:00`,
      );
    } else {
      activityQuery = activityQuery.gte("start_at", new Date().toISOString());
    }

    const { data: activitySessions, error: activityError } =
      await activityQuery;
    if (activityError) {
      throw activityError;
    }

    for (const session of activitySessions || []) {
      const capacityAvailable =
        typeof session.capacity_available === "number"
          ? session.capacity_available
          : 0;
      if (
        capacityAvailable > 0 &&
        (!minGuests || capacityAvailable >= minGuests)
      ) {
        availableExperienceIds.add(session.experience_id);
      }
    }
  }

  const lodgingItems = items.filter((item) => item.type === "lodging");
  const lodgingExperienceIds = lodgingItems.map((item) => item.id);

  if (lodgingExperienceIds.length > 0) {
    const lodgingFromDate = hasDateFilter && dateFrom ? dateFrom : null;
    const lodgingToDateExclusive = lodgingFromDate
      ? isValidIsoDate(dateTo) && dateTo > lodgingFromDate
        ? dateTo
        : addDaysToIsoDate(lodgingFromDate, 1)
      : null;
    const stayDates =
      lodgingFromDate && lodgingToDateExclusive
        ? enumerateDateRange(lodgingFromDate, lodgingToDateExclusive)
        : [];

    const bookedByRoomAndDate = new Map<string, Map<string, number>>();

    if (lodgingFromDate && lodgingToDateExclusive) {
      const { data: lodgingBookings, error: lodgingBookingsError } =
        await supabase
          .from("bookings")
          .select("experience_id, from_date, to_date, rooms")
          .in("experience_id", lodgingExperienceIds)
          .eq("status", "confirmed")
          .lt("from_date", lodgingToDateExclusive)
          .gt("to_date", lodgingFromDate);

      if (lodgingBookingsError) {
        throw lodgingBookingsError;
      }

      for (const booking of lodgingBookings || []) {
        const overlapStart =
          booking.from_date > lodgingFromDate
            ? booking.from_date
            : lodgingFromDate;
        const overlapEnd =
          booking.to_date < lodgingToDateExclusive
            ? booking.to_date
            : lodgingToDateExclusive;

        if (overlapStart >= overlapEnd) {
          continue;
        }

        const overlapDates = enumerateDateRange(overlapStart, overlapEnd);
        const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];

        for (const rawRoom of rooms) {
          const room =
            typeof rawRoom === "object" && rawRoom !== null
              ? (rawRoom as Record<string, unknown>)
              : null;
          const roomTypeId =
            room && typeof room.room_type_id === "string"
              ? room.room_type_id
              : null;
          const quantity = room ? Number(room.quantity) || 0 : 0;
          if (!roomTypeId || quantity <= 0) continue;

          const roomDateMap =
            bookedByRoomAndDate.get(roomTypeId) || new Map<string, number>();

          for (const date of overlapDates) {
            roomDateMap.set(date, (roomDateMap.get(date) || 0) + quantity);
          }

          bookedByRoomAndDate.set(roomTypeId, roomDateMap);
        }
      }
    }

    for (const item of lodgingItems) {
      const candidateRooms = item._roomTypes.filter(
        (room) => !minGuests || (room.max_persons || 0) >= minGuests,
      );

      if (candidateRooms.length === 0) {
        continue;
      }

      if (!lodgingFromDate || stayDates.length === 0) {
        availableExperienceIds.add(item.id);
        continue;
      }

      const hasAvailableRoom = candidateRooms.some((room) => {
        const totalRooms = room.total_rooms || 0;
        if (totalRooms <= 0) {
          return false;
        }

        const bookedByDate = bookedByRoomAndDate.get(room.id);
        return stayDates.every((date) => {
          const bookedRooms = bookedByDate?.get(date) || 0;
          return totalRooms - bookedRooms > 0;
        });
      });

      if (hasAvailableRoom) {
        availableExperienceIds.add(item.id);
      }
    }
  }

  return items.filter((item) => availableExperienceIds.has(item.id));
}

export async function fetchExploreSearchResults(
  input: ExploreSearchInput = {},
): Promise<ExploreSearchResult> {
  const supabase = await createClient();
  const {
    type,
    search,
    limit = 20,
    offset = 0,
    sort = SORT_DEFAULT,
    priceMin,
    priceMax,
    guests,
    dateFrom,
    dateTo,
  } = input;

  let query = supabase
    .from("experiences")
    .select(EXPERIENCE_LIST_SELECT)
    .eq("status", "published")
    .is("deleted_at", null);

  if (type) {
    query = query.eq("type", type);
  }

  if (search) {
    const hasArabic = /[\u0600-\u06FF]/.test(search);
    const hasEnglish = /^[a-zA-Z0-9\s]+$/.test(search);

    let searchColumn = "search_vector_fr";
    let config: "french" | "english" | "arabic" = "french";

    if (hasArabic) {
      searchColumn = "search_vector_ar";
      config = "arabic";
    } else if (hasEnglish) {
      searchColumn = "search_vector_en";
      config = "english";
    }

    query = query.or(
      `${searchColumn}.wfts(${config}).${search},title.ilike.%${search}%,short_description.ilike.%${search}%`,
    );
  }

  query = applySort(query, sort);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const mappedItems = (data || []).map(mapExperienceWithMeta).filter((exp) => {
    if (
      priceMin != null &&
      exp._priceCents != null &&
      exp._priceCents < priceMin * 100
    ) {
      return false;
    }
    if (
      priceMax != null &&
      exp._priceCents != null &&
      exp._priceCents > priceMax * 100
    ) {
      return false;
    }
    return true;
  });

  const availabilityFilteredItems = await applyAvailabilityFilters(
    supabase,
    mappedItems,
    guests,
    dateFrom,
    dateTo,
  );

  return {
    items: availabilityFilteredItems.map(
      ({ _priceCents, _roomTypes, ...exp }) => exp,
    ),
    fetchedCount: (data || []).length,
  };
}

export async function fetchExploreCategoryGroups(
  limitPerCategory = 8,
  locale: AppLocale = DEFAULT_LOCALE,
): Promise<ExploreCategoryGroup[]> {
  const supabase = await createClient();

  const { data: allCategories, error: categoriesError } = await supabase
    .from("categories" as never)
    .select("*")
    .eq("is_active" as never, true)
    .limit(6);

  if (categoriesError) {
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
    throw usedCategoriesError;
  }

  const usedCategoryIds = new Set(
    ((usedCategoriesData ?? []) as Array<{ category_id: string }>).map(
      (item) => item.category_id,
    ),
  );

  const categories = (
    (allCategories ?? []) as Array<{
      id: string;
      title:
        | string
        | {
            fr?: string | null;
            en?: string | null;
            ar?: string | null;
          }
        | null;
      slug: string | null;
      asset: string | null;
    }>
  ).filter((category) => usedCategoryIds.has(category.id));

  const results: ExploreCategoryGroup[] = [];

  for (const category of categories) {
    const { data: expData, error: expError } = await supabase
      .from("experience_categories" as never)
      .select(`experience:experiences!inner(${EXPERIENCE_LIST_SELECT})`)
      .eq("category_id" as never, category.id)
      .eq("experience.status" as never, "published")
      .is("experience.deleted_at" as never, null)
      .limit(limitPerCategory);

    if (expError) {
      continue;
    }

    const experiences = (
      (expData || []) as Array<{ experience: RawExperience }>
    )
      .map((item) => mapExperienceWithMeta(item.experience))
      .map(({ _priceCents, _roomTypes, ...exp }) => exp);

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
}
