import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  ExperienceListItem,
  ExperienceSort,
  ExperienceType,
} from "@/types/experience";
import { resolveStorageUrl } from "@/utils/functions";

interface FetchExperiencesParams {
  type?: ExperienceType;
  search?: string;
  limit?: number;
  featured?: boolean;
  sort?: ExperienceSort;
  offset?: number;
  priceMin?: number;
  priceMax?: number;
  guests?: number;
  dateFrom?: string;
  dateTo?: string;
}

const SORT_DEFAULT: ExperienceSort = "newest";

interface ExperienceWithMeta extends ExperienceListItem {
  _priceCents: number | null;
  _roomTypes: Array<{
    id: string;
    max_persons: number | null;
    total_rooms: number | null;
  }>;
}

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

async function applyAvailabilityFilters(
  supabase: ReturnType<typeof createClient>,
  items: ExperienceWithMeta[],
  guests?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<ExperienceWithMeta[]> {
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

function applySort(query: any, sort: ExperienceSort) {
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

interface FetchExperiencesResult {
  items: ExperienceListItem[];
  fetchedCount: number;
}

async function fetchExperiencesWithMeta(
  params: FetchExperiencesParams = {},
): Promise<FetchExperiencesResult> {
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
    guests,
    dateFrom,
    dateTo,
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
        id,
        price_cents,
        currency,
        max_persons,
        total_rooms
      )`;

  let query = supabase
    .from("experiences")
    .select(baseFields)
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

  if (featured) {
    query = query
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .order("bookings_count", { ascending: false, nullsFirst: false });
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

  const mappedItems = (data || [])
    .map((exp: any) => {
      const lodgingData = Array.isArray(exp.lodging)
        ? exp.lodging[0] || null
        : exp.lodging;
      const rooms = exp.rooms || [];
      const minRoomPrice =
        rooms.length > 0
          ? rooms.reduce((min: any, room: any) => {
              if (
                !min ||
                (room.price_cents && room.price_cents < min.price_cents)
              ) {
                return room;
              }
              return min;
            }, null)
          : null;

      const tripData = Array.isArray(exp.trip) ? exp.trip[0] || null : exp.trip;
      const priceCents =
        tripData?.price_cents || minRoomPrice?.price_cents || null;

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
        _roomTypes: Array.isArray(rooms)
          ? rooms.map((room: any) => ({
              id: room.id,
              max_persons: room.max_persons ?? null,
              total_rooms: room.total_rooms ?? null,
            }))
          : [],
      };
    })
    .filter((exp: ExperienceWithMeta) => {
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

async function fetchExperiences(
  params: FetchExperiencesParams = {},
): Promise<ExperienceListItem[]> {
  const result = await fetchExperiencesWithMeta(params);
  return result.items;
}

export function useExperiences(params: FetchExperiencesParams = {}) {
  return useQuery({
    queryKey: ["experiences", params],
    queryFn: () => fetchExperiences(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInfiniteExperiences(
  params: Omit<FetchExperiencesParams, "limit" | "offset"> & {
    pageSize?: number;
  } = {},
  enabled = true,
) {
  const { pageSize = 12, ...rest } = params;

  return useInfiniteQuery({
    queryKey: ["experiences-infinite", rest, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const { items, fetchedCount } = await fetchExperiencesWithMeta({
        ...rest,
        limit: pageSize,
        offset: pageParam * pageSize,
      });

      return {
        items,
        page: pageParam,
        hasMore: fetchedCount === pageSize,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 5,
    enabled,
  });
}
