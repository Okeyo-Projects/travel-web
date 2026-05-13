import { type NextRequest, NextResponse } from "next/server";
import type { ResolvedChatDeepLinkExperience } from "@/lib/chat/deep-link";
import { getLowestPricedRoom } from "@/lib/experience-pricing";
import { getLocalizedDescription, resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import type {
  ExperienceAmenity,
  ExperienceDetail,
  ExperienceService,
} from "@/types/experience-detail";

function buildDeepLinkExperienceResponse(
  experience: ExperienceDetail,
  locale: "fr" | "en" | "ar",
): ResolvedChatDeepLinkExperience {
  const lowestPricedRoom = getLowestPricedRoom(experience.lodging?.rooms);
  const priceCents =
    experience.trip?.price_cents ?? lowestPricedRoom?.price_cents;
  const currency =
    experience.trip?.currency ?? lowestPricedRoom?.currency ?? "MAD";
  const description =
    getLocalizedDescription(experience, locale, "short") ||
    getLocalizedDescription(experience, locale, "long");
  const amenities = experience.amenities
    .map((amenity) => amenity.label)
    .filter((label) => label.trim().length > 0)
    .slice(0, 6);
  const gallery = experience.gallery
    .map((media) => media.thumbnailUrl ?? media.url)
    .filter(
      (url): url is string => typeof url === "string" && url.trim().length > 0,
    );
  const thumbnailUrl =
    experience.thumbnailUrl ??
    experience.video?.thumbnailUrl ??
    gallery[0] ??
    null;

  return {
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    type: experience.type,
    city: experience.city,
    region: experience.region,
    country: experience.country,
    description,
    priceMad:
      typeof priceCents === "number" ? Math.round(priceCents / 100) : null,
    currency,
    rating: experience.metrics.rating,
    reviewCount: experience.metrics.reviews,
    amenities,
    thumbnailUrl,
    videoUrl: experience.video?.url ?? null,
    videoHlsUrl: experience.video?.hlsUrl ?? null,
    gallery,
    hostName: experience.host?.name ?? null,
    rooms:
      experience.lodging?.rooms.map((room) => ({
        id: room.id,
        name: room.name || room.room_type,
        type: room.room_type,
        priceMad:
          typeof room.price_cents === "number" ? room.price_cents / 100 : null,
        capacityBeds: room.capacity_beds,
        maxPersons: room.max_persons,
        photos: room.photoUrls,
      })) ?? [],
  };
}

function mapAmenityForChatCard(amenity: ExperienceAmenity) {
  return {
    key: amenity.key,
    label_fr: amenity.label,
    label_en: amenity.label,
    label_ar: amenity.label,
    category: amenity.category,
  };
}

function mapServiceForChatCard(service: ExperienceService) {
  return {
    key: service.key,
    label_fr: service.label,
    label_en: service.label,
    label_ar: service.label,
    category: service.category,
    notes: service.notes,
  };
}

function buildDeepLinkDetailsResponse(experience: ExperienceDetail) {
  const futureDepartures =
    experience.trip?.departures?.filter((departure) => {
      if (!departure.depart_at) return false;
      return new Date(departure.depart_at).getTime() >= Date.now();
    }) ?? [];

  return {
    experience: {
      id: experience.id,
      title: experience.title,
      short_description: experience.shortDescription,
      long_description: experience.longDescription,
      short_description_en: experience.short_description_en,
      short_description_fr: experience.short_description_fr,
      short_description_ar: experience.short_description_ar,
      long_description_en: experience.long_description_en,
      long_description_fr: experience.long_description_fr,
      long_description_ar: experience.long_description_ar,
      type: experience.type,
      city: experience.city,
      region: experience.region,
      languages: experience.languages,
      cancellation_policy: experience.cancellationPolicy,
      tags: experience.tags,
      avg_rating: experience.metrics.rating,
      reviews_count: experience.metrics.reviews,
      bookings_count: experience.metrics.bookings,
      thumbnail_url: experience.thumbnailUrl,
    },
    host: experience.host
      ? {
          name: experience.host.name,
          bio: experience.host.bio,
          avg_rating: experience.host.avgRating,
          total_bookings: experience.host.totalBookings,
        }
      : null,
    amenities: experience.amenities.map(mapAmenityForChatCard),
    services_included: experience.servicesIncluded.map(mapServiceForChatCard),
    services_excluded: experience.servicesExcluded.map(mapServiceForChatCard),
    lodging: experience.lodging
      ? {
          lodging_type: experience.lodging.lodging_type,
          non_fumeur: experience.lodging.non_fumeur,
          animaux_acceptes: experience.lodging.animaux_acceptes,
          check_in_time: experience.lodging.check_in_time,
          check_out_time: experience.lodging.check_out_time,
          min_stay_nights: experience.lodging.min_stay_nights,
          house_rules: experience.lodging.house_rules,
        }
      : null,
    room_types:
      experience.lodging?.rooms.map((room) => ({
        id: room.id,
        type: room.room_type,
        name: room.name,
        description: room.description,
        capacity_beds: room.capacity_beds,
        max_persons: room.max_persons,
        price_mad:
          typeof room.price_cents === "number" ? room.price_cents / 100 : null,
        equipments:
          room.items.length > 0
            ? room.items.map((item) => item.label)
            : room.itemKeys,
      })) ?? [],
    trip: experience.trip
      ? {
          category: experience.trip.category,
          departure_place: experience.trip.departure_place,
          arrival_place: experience.trip.arrival_place,
          duration_days: experience.trip.duration_days,
          duration_hours: experience.trip.duration_hours,
          start_time: experience.trip.start_time,
          end_time: experience.trip.end_time,
          group_size_max: experience.trip.group_size_max,
          min_participants: experience.trip.min_participants,
          min_age: experience.trip.min_age,
          restrictions: experience.trip.restrictions,
          what_to_bring: experience.trip.what_to_bring,
          skill_level: experience.trip.skill_level,
          stops: experience.trip.stops,
          physical_difficulty: experience.trip.physical_difficulty,
          price_mad:
            typeof experience.trip.price_cents === "number"
              ? experience.trip.price_cents / 100
              : null,
        }
      : null,
    itinerary:
      experience.trip?.itinerary.map((item) => ({
        day_number: item.day_number,
        title: item.title,
        details: item.details,
        location_name: item.location_name,
        duration_minutes: item.duration_minutes,
      })) ?? [],
    upcoming_departures: futureDepartures.map((departure) => ({
      id: departure.id,
      depart_at: departure.depart_at,
      return_at: departure.return_at,
      seats_available: departure.seats_available,
      seats_total: departure.seats_total,
      price_override_mad:
        typeof departure.price_override_cents === "number"
          ? departure.price_override_cents / 100
          : null,
    })),
    activity: null,
    upcoming_sessions: [],
    recent_reviews: [],
    promotion_info: {
      has_promo: false,
      promo_count: 0,
      auto_apply_available: false,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    const locale = resolveLocale(req.nextUrl.searchParams.get("lang"));
    const data = await fetchExperienceData(identifier, locale);

    if (!data?.transformed) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      experience: buildDeepLinkExperienceResponse(data.transformed, locale),
      details: buildDeepLinkDetailsResponse(data.transformed),
    });
  } catch (error) {
    console.error("Experience deeplink lookup error:", error);
    return NextResponse.json(
      { error: "Failed to resolve experience" },
      { status: 500 },
    );
  }
}
