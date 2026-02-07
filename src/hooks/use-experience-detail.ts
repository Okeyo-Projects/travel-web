import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { resolveStorageUrl } from '@/utils/functions';
import type { Database } from '@/types/supabase';
import type {
  ExperienceDetail,
  SupabaseExperienceRecord,
  ExperienceMedia,
  ExperienceHost,
  ExperienceAmenity,
  ExperienceService,
  ExperienceLodging,
  ExperienceTrip,
  ExperienceRoom,
  ExperienceMediaRecord,
  ExperienceAmenityRecord,
  ExperienceServiceRecord,
  ExperienceLodgingRecord,
} from '@/types/experience-detail';

const SELECT_EXPERIENCE_DETAIL = `
  id,
  title,
  short_description,
  long_description,
  city,
  region,
  address,
  address->>'country' AS country,
  type,
  tags,
  languages,
  cancellation_policy,
  metadata,
  thumbnail_url,
  video_id,
  avg_rating,
  reviews_count,
  views_count,
  saves_count,
  bookings_count,
  created_at,
  updated_at,
  host:hosts!experiences_host_id_fkey(
    id,
    name,
    avatar_url,
    bio,
    city,
    country,
    cover_image_url,
    avg_rating,
    total_experiences,
    total_bookings,
    verified,
    response_time_hours,
    response_rate
  ),
  video:media_assets!fk_experiences_video(
    id,
    path,
    hls_playlist_url,
    metadata,
    kind,
    duration_seconds
  ),
  media:experience_media(
    id,
    role,
    caption,
    order_index,
    asset:media_assets!experience_media_media_id_fkey(
      id,
      path,
      hls_playlist_url,
      metadata,
      kind,
      duration_seconds
    )
  ),
  amenities:experience_amenities(
    amenity_key,
    amenity:amenities(
      key,
      label_en,
      label_fr,
      icon,
      category
    )
  ),
  rooms:lodging_room_types(
    id,
    name,
    description,
    room_type,
    capacity_beds,
    max_persons,
    price_cents,
    currency,
    total_rooms,
    photos,
    equipments
  ),
  lodging:experiences_lodging!experiences_lodging_experience_id_fkey(
    lodging_type,
    non_fumeur,
    animaux_acceptes,
    check_in_time,
    check_out_time,
    min_stay_nights,
    house_rules
  ),
  trip:experiences_trip!experiences_trip_experience_id_fkey(
    category,
    departure_place,
    arrival_place,
    duration_days,
    duration_hours,
    start_time,
    end_time,
    group_size_max,
    min_participants,
    min_age,
    restrictions,
    price_cents,
    currency,
    price_children_cents,
    what_to_bring,
    skill_level,
    stops,
    physical_difficulty
  ),
  itinerary:trip_itinerary(
    id,
    day_number,
    order_index,
    title,
    details,
    duration_minutes,
    location_name
  ),
  departures:trip_departures(
    id,
    depart_at,
    return_at,
    seats_total,
    seats_available,
    price_override_cents
  ),
  servicesIncluded:experience_services_included(
    service_key,
    notes,
    service:services(
      key,
      label_en,
      label_fr,
      icon,
      category
    )
  ),
  servicesExcluded:experience_services_excluded(
    service_key,
    notes,
    service:services(
      key,
      label_en,
      label_fr,
      icon,
      category
    )
  )
`;

// Helper functions for parsing
function extractThumbnailFromMetadata(metadata: any): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const candidate =
    (typeof record['thumbnail_path'] === 'string' && (record['thumbnail_path'] as string)) ||
    (typeof record['thumbnailUrl'] === 'string' && (record['thumbnailUrl'] as string)) ||
    (typeof record['thumbnail'] === 'string' && (record['thumbnail'] as string)) ||
    null;

  return candidate;
}

function parseMedia(record: ExperienceMediaRecord[] | null | undefined): ExperienceMedia[] {
  if (!record?.length) {
    return [];
  }

  return record
    .map((item) => {
      const asset = item.asset;
      const url = asset?.path ? resolveStorageUrl(asset.path) : null;
      const rawThumbnail = extractThumbnailFromMetadata(asset?.metadata);
      const thumbnailUrl = rawThumbnail ? resolveStorageUrl(rawThumbnail) : url;
      const hlsUrl = asset?.hls_playlist_url
        ? resolveStorageUrl(asset.hls_playlist_url)
        : null;
      const kind = asset?.kind ?? 'photo';
      const durationSeconds = asset?.duration_seconds ?? null;

      return {
        id: item.id,
        role: item.role ?? null,
        kind,
        caption: item.caption,
        url,
        thumbnailUrl,
        hlsUrl,
        durationSeconds,
      };
    })
    .filter((media) => media.url || media.hlsUrl);
}

function parseHost(host: any | null | undefined): ExperienceHost | null {
  if (!host) {
    return null;
  }

  return {
    id: host.id,
    name: host.name,
    avatarUrl: resolveStorageUrl(host.avatar_url),
    coverUrl: resolveStorageUrl(host.cover_image_url),
    bio: host.bio,
    city: host.city,
    country: host.country,
    avgRating: host.avg_rating,
    totalExperiences: host.total_experiences,
    totalBookings: host.total_bookings,
    verified: host.verified,
    responseTimeHours: host.response_time_hours,
    responseRate: host.response_rate,
  };
}

function parseAmenities(records: ExperienceAmenityRecord[] | null | undefined): ExperienceAmenity[] {
  if (!records?.length) {
    return [];
  }

  return records
    .map((item) => {
      const source = item.amenity;
      if (!source) {
        return null;
      }

      return {
        key: source.key,
        label: source.label_en ?? source.label_fr ?? source.key,
        icon: source.icon,
        category: source.category,
      };
    })
    .filter(Boolean) as ExperienceAmenity[];
}

function parseServices(records: ExperienceServiceRecord[] | null | undefined, type: 'included' | 'excluded'): ExperienceService[] {
  if (!records?.length) {
    return [];
  }

  return records
    .map((item) => {
      const service = item.service;
      if (!service) {
        return null;
      }

      return {
        key: service.key,
        label: service.label_en ?? service.label_fr ?? service.key,
        icon: service.icon,
        category: service.category,
        notes: item.notes ?? null,
        type,
      };
    })
    .filter(Boolean) as ExperienceService[];
}

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseLodging(
  lodgingRecords: ExperienceLodgingRecord | ExperienceLodgingRecord[] | null | undefined,
  roomRecords: any[] | null | undefined
): ExperienceLodging | null {
  const lodging = normalizeSingle(lodgingRecords);
  if (!lodging) {
    return null;
  }

  const rooms: ExperienceRoom[] = (roomRecords ?? []).map((room) => {
    const photoUrls =
      Array.isArray(room.photos) && room.photos.length
        ? room.photos
            .map((path: string) => resolveStorageUrl(path))
            .filter((url: string | null): url is string => typeof url === 'string' && url.length > 0)
        : [];

    const itemKeys = Array.isArray(room.equipments) ? room.equipments.filter(Boolean) : [];

    return {
      ...room,
      photoUrls,
      itemKeys,
    };
  });

  return {
    ...lodging,
    rooms,
  };
}

function parseTrip(
  tripRecords: any | any[] | null | undefined,
  itineraryRecords: any | any[] | null | undefined,
  departureRecords: any | any[] | null | undefined
): ExperienceTrip | null {
  const trip = normalizeSingle(tripRecords);
  if (!trip) {
    return null;
  }

  const priceCents = typeof trip.price_cents === 'number' ? trip.price_cents : null;
  const sortedItinerary = normalizeArray(itineraryRecords).sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
  const sortedDepartures = normalizeArray(departureRecords).sort(
    (a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime()
  );

  return {
    ...trip,
    itinerary: sortedItinerary,
    departures: sortedDepartures,
    price_per_person: priceCents != null ? priceCents / 100 : 0,
    price_currency: trip.currency ?? 'USD',
  };
}

function transformRecord(record: SupabaseExperienceRecord): ExperienceDetail {
  const gallery = parseMedia(record.media);
  const videoMedia = record.video
    ? {
        id: record.video.id,
        role: null,
        kind: record.video.kind ?? 'video',
        caption: null,
        url: resolveStorageUrl(record.video.path),
        thumbnailUrl: (() => {
          const thumb = extractThumbnailFromMetadata(record.video?.metadata);
          const resolved = thumb ? resolveStorageUrl(thumb) : null;
          return resolved ?? resolveStorageUrl(record.thumbnail_url);
        })(),
        hlsUrl: record.video.hls_playlist_url
          ? resolveStorageUrl(record.video.hls_playlist_url)
          : null,
        durationSeconds: record.video.duration_seconds ?? null,
      }
    : null;

  const galleryWithoutVideo = videoMedia
    ? gallery.filter((item) => item.id !== videoMedia.id)
    : gallery;

  const address = (record.address as Record<string, unknown> | null) ?? null;
  const fallbackCountry =
    address && typeof address['country'] === 'string' ? (address['country'] as string) : null;
  const country = record.country ?? fallbackCountry;

  return {
    id: record.id,
    title: record.title,
    shortDescription: record.short_description,
    longDescription: record.long_description,
    city: record.city,
    region: record.region,
    country,
    address,
    type: record.type,
    tags: record.tags ?? [],
    languages: record.languages ?? [],
    cancellationPolicy: record.cancellation_policy,
    thumbnailUrl: resolveStorageUrl(record.thumbnail_url),
    video: videoMedia,
    gallery: galleryWithoutVideo,
    metrics: {
      reviews: record.reviews_count ?? 0,
      rating: record.avg_rating,
      bookings: record.bookings_count ?? 0,
      saves: record.saves_count ?? 0,
      views: record.views_count ?? 0,
    },
    host: parseHost(record.host),
    lodging: parseLodging(record.lodging, record.rooms),
    trip: parseTrip(record.trip, record.itinerary, record.departures),
    amenities: parseAmenities(record.amenities),
    servicesIncluded: parseServices(record.servicesIncluded, 'included'),
    servicesExcluded: parseServices(record.servicesExcluded, 'excluded'),
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export type ExperienceDetailResponse =
  | {
      transformed: ExperienceDetail;
      raw: SupabaseExperienceRecord;
    }
  | null;

async function fetchExperienceDetail(experienceId: string): Promise<ExperienceDetailResponse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('experiences')
    .select(SELECT_EXPERIENCE_DETAIL)
    .eq('id', experienceId)
    .maybeSingle<SupabaseExperienceRecord>();
  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    transformed: transformRecord(data),
    raw: data,
  };
}

export function useExperienceDetail(experienceId: string | null | undefined) {
  return useQuery<ExperienceDetailResponse>({
    queryKey: ['experience-detail', experienceId],
    queryFn: async () => {
      if (!experienceId) {
        return null;
      }
      return fetchExperienceDetail(experienceId);
    },
    enabled: !!experienceId,
    staleTime: 1000 * 60 * 5,
  });
}
