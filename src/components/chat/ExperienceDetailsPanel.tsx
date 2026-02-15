"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getImageUrl } from "@/utils/functions";

type Primitive = string | number | boolean | null | undefined;

export interface ExperienceDetailsData {
  experience: {
    id: string;
    title: string;
    short_description?: string | null;
    long_description?: string | null;
    type: "lodging" | "trip" | "activity" | string;
    city?: string | null;
    region?: string | null;
    languages?: string[];
    cancellation_policy?: string | null;
    tags?: string[] | null;
    avg_rating?: number | null;
    reviews_count?: number | null;
    bookings_count?: number | null;
    thumbnail_url?: string | null;
  };
  host?: {
    name?: string | null;
    bio?: string | null;
    avg_rating?: number | null;
    total_bookings?: number | null;
    joined_at?: string | null;
  } | null;
  amenities?: Array<{
    key?: string;
    label_fr?: string;
    category?: string;
  }>;
  services_included?: Array<{
    key?: string;
    label_fr?: string;
    category?: string;
    notes?: string | null;
  }>;
  services_excluded?: Array<{
    key?: string;
    label_fr?: string;
    category?: string;
    notes?: string | null;
  }>;
  lodging?: Record<string, unknown> | null;
  room_types?: Array<{
    id: string;
    type?: string;
    name?: string | null;
    description?: string | null;
    capacity_beds?: number | null;
    max_persons?: number | null;
    price_mad?: number | null;
    equipments?: string[] | null;
  }>;
  trip?: Record<string, unknown> | null;
  itinerary?: Array<{
    day_number?: number | null;
    title?: string | null;
    details?: string | null;
    location_name?: string | null;
    duration_minutes?: number | null;
  }>;
  upcoming_departures?: Array<{
    id: string;
    depart_at?: string | null;
    return_at?: string | null;
    seats_available?: number | null;
    seats_total?: number | null;
    price_override_mad?: number | null;
  }>;
  activity?: Record<string, unknown> | null;
  upcoming_sessions?: Array<{
    id: string;
    start_at?: string | null;
    end_at?: string | null;
    capacity_available?: number | null;
    capacity_total?: number | null;
    price_override_mad?: number | null;
  }>;
  recent_reviews?: Array<{
    id: string;
    rating?: number | null;
    comment?: string | null;
    created_at?: string | null;
    user?: {
      full_name?: string | null;
    } | null;
  }>;
  promotion_info?: Record<string, unknown> | null;
}

const EXPERIENCE_TYPE_LABEL: Record<string, string> = {
  lodging: "Hébergement",
  trip: "Voyage",
  activity: "Activité",
};

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDisplayLabel(input: string): string {
  return input
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPrimitiveValue(value: Primitive): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

function getDetailEntries(
  source: Record<string, unknown> | null | undefined,
  ignoredKeys: string[] = [],
) {
  if (!source) return [];
  const ignored = new Set(ignoredKeys);

  return Object.entries(source)
    .filter(([key, value]) => {
      if (ignored.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === "object") return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: toDisplayLabel(key),
      value: formatPrimitiveValue(value as Primitive),
    }))
    .filter((entry) => entry.value.length > 0);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function KeyValueGrid({
  entries,
}: {
  entries: Array<{ key: string; label: string; value: string }>;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="rounded-md border bg-background/60 px-3 py-2"
        >
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {entry.label}
          </p>
          <p className="text-sm">{entry.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ExperienceDetailsPanel({
  details,
}: {
  details: ExperienceDetailsData;
}) {
  const experience = details.experience;
  const experienceType =
    EXPERIENCE_TYPE_LABEL[experience.type] || experience.type;
  const imageUrl = getImageUrl(experience.thumbnail_url || undefined);
  const location = [experience.city, experience.region]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(", ");

  const lodgingEntries = getDetailEntries(details.lodging, [
    "experience_id",
    "metadata",
    "created_at",
    "updated_at",
  ]);
  const tripEntries = getDetailEntries(details.trip, [
    "experience_id",
    "metadata",
    "created_at",
    "updated_at",
    "itinerary",
  ]);
  const activityEntries = getDetailEntries(details.activity, [
    "experience_id",
    "metadata",
    "created_at",
    "updated_at",
  ]);

  const promotionEntries = getDetailEntries(details.promotion_info, []);

  return (
    <Card className="overflow-hidden border-primary/20">
      {imageUrl ? (
        <div className="relative h-52 w-full">
          <Image
            src={imageUrl}
            alt={experience.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}

      <CardContent className="p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{experienceType}</Badge>
            {experience.avg_rating ? (
              <Badge variant="outline">
                {experience.avg_rating.toFixed(1)} / 5
                {experience.reviews_count
                  ? ` (${experience.reviews_count} avis)`
                  : ""}
              </Badge>
            ) : null}
            {typeof experience.bookings_count === "number" ? (
              <Badge variant="outline">
                {experience.bookings_count} réservations
              </Badge>
            ) : null}
          </div>

          <h3 className="text-xl font-semibold">{experience.title}</h3>
          {location ? (
            <p className="text-sm text-muted-foreground">{location}</p>
          ) : null}

          {experience.short_description ? (
            <p className="text-sm">{experience.short_description}</p>
          ) : null}
          {experience.long_description ? (
            <p className="text-sm text-muted-foreground">
              {experience.long_description}
            </p>
          ) : null}

          {Array.isArray(experience.languages) &&
          experience.languages.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {experience.languages.map((lang) => (
                <Badge key={lang} variant="outline">
                  {lang}
                </Badge>
              ))}
            </div>
          ) : null}

          {Array.isArray(experience.tags) && experience.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {experience.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {details.host?.name ? (
          <Section title="Hôte">
            <div className="rounded-md border bg-background/60 px-3 py-2 space-y-1">
              <p className="font-medium">{details.host.name}</p>
              {typeof details.host.avg_rating === "number" ? (
                <p className="text-xs text-muted-foreground">
                  Note hôte: {details.host.avg_rating.toFixed(1)} / 5
                </p>
              ) : null}
              {typeof details.host.total_bookings === "number" ? (
                <p className="text-xs text-muted-foreground">
                  Réservations hôte: {details.host.total_bookings}
                </p>
              ) : null}
              {details.host.bio ? (
                <p className="text-sm text-muted-foreground">
                  {details.host.bio}
                </p>
              ) : null}
            </div>
          </Section>
        ) : null}

        {Array.isArray(details.amenities) && details.amenities.length > 0 ? (
          <Section title="Équipements">
            <div className="flex flex-wrap gap-1">
              {details.amenities.map((amenity, index) => {
                const label = amenity.label_fr || amenity.key;
                if (!label) return null;
                return (
                  <Badge key={`${label}-${index}`} variant="outline">
                    {label}
                  </Badge>
                );
              })}
            </div>
          </Section>
        ) : null}

        {Array.isArray(details.services_included) &&
        details.services_included.length > 0 ? (
          <Section title="Services inclus">
            <div className="space-y-1">
              {details.services_included.map((service, index) => (
                <p
                  key={`${service.key || service.label_fr}-${index}`}
                  className="text-sm"
                >
                  • {service.label_fr || service.key}
                  {service.notes ? ` — ${service.notes}` : ""}
                </p>
              ))}
            </div>
          </Section>
        ) : null}

        {Array.isArray(details.services_excluded) &&
        details.services_excluded.length > 0 ? (
          <Section title="Services exclus">
            <div className="space-y-1">
              {details.services_excluded.map((service, index) => (
                <p
                  key={`${service.key || service.label_fr}-${index}`}
                  className="text-sm"
                >
                  • {service.label_fr || service.key}
                  {service.notes ? ` — ${service.notes}` : ""}
                </p>
              ))}
            </div>
          </Section>
        ) : null}

        {experience.type === "lodging" ? (
          <Section title="Chambres">
            {Array.isArray(details.room_types) &&
            details.room_types.length > 0 ? (
              <div className="space-y-2">
                {details.room_types.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-md border bg-background/60 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {room.name || room.type || "Chambre"}
                      </p>
                      {typeof room.price_mad === "number" ? (
                        <Badge variant="outline">
                          {room.price_mad} MAD / nuit
                        </Badge>
                      ) : null}
                    </div>
                    {room.description ? (
                      <p className="text-sm text-muted-foreground">
                        {room.description}
                      </p>
                    ) : null}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {typeof room.max_persons === "number" ? (
                        <span>Max: {room.max_persons} pers.</span>
                      ) : null}
                      {typeof room.capacity_beds === "number" ? (
                        <span>{room.capacity_beds} lits</span>
                      ) : null}
                    </div>
                    {Array.isArray(room.equipments) &&
                    room.equipments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {room.equipments.map((equipment) => (
                          <Badge
                            key={`${room.id}-${equipment}`}
                            variant="secondary"
                          >
                            {equipment}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune chambre configurée.
              </p>
            )}
            <KeyValueGrid entries={lodgingEntries} />
          </Section>
        ) : null}

        {experience.type === "trip" ? (
          <Section title="Voyage">
            <KeyValueGrid entries={tripEntries} />

            {Array.isArray(details.itinerary) &&
            details.itinerary.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Itinéraire</p>
                {details.itinerary.map((item, index) => (
                  <div
                    key={`${item.day_number || index}-${item.title || index}`}
                    className="rounded-md border bg-background/60 px-3 py-2"
                  >
                    <p className="text-sm font-medium">
                      Jour {item.day_number || "?"}: {item.title || "Étape"}
                    </p>
                    {item.location_name ? (
                      <p className="text-xs text-muted-foreground">
                        {item.location_name}
                      </p>
                    ) : null}
                    {item.details ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.details}
                      </p>
                    ) : null}
                    {typeof item.duration_minutes === "number" ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Durée: {item.duration_minutes} min
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {Array.isArray(details.upcoming_departures) &&
            details.upcoming_departures.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Prochains départs</p>
                {details.upcoming_departures.map((departure) => (
                  <div
                    key={departure.id}
                    className="rounded-md border bg-background/60 px-3 py-2 text-sm"
                  >
                    <p>
                      {formatDateTime(departure.depart_at) ||
                        departure.depart_at}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Places: {departure.seats_available ?? "?"}/
                      {departure.seats_total ?? "?"}
                    </p>
                    {typeof departure.price_override_mad === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        Prix: {departure.price_override_mad} MAD
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {experience.type === "activity" ? (
          <Section title="Activité">
            <KeyValueGrid entries={activityEntries} />
            {Array.isArray(details.upcoming_sessions) &&
            details.upcoming_sessions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Prochaines sessions</p>
                {details.upcoming_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-md border bg-background/60 px-3 py-2 text-sm"
                  >
                    <p>
                      {formatDateTime(session.start_at) || session.start_at}
                    </p>
                    {session.end_at ? (
                      <p className="text-xs text-muted-foreground">
                        Fin: {formatDateTime(session.end_at) || session.end_at}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Capacite: {session.capacity_available ?? "?"}/
                      {session.capacity_total ?? "?"}
                    </p>
                    {typeof session.price_override_mad === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        Prix: {session.price_override_mad} MAD
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {promotionEntries.length > 0 ? (
          <Section title="Promotions">
            <KeyValueGrid entries={promotionEntries} />
          </Section>
        ) : null}

        {Array.isArray(details.recent_reviews) &&
        details.recent_reviews.length > 0 ? (
          <Section title="Avis récents">
            <div className="space-y-2">
              {details.recent_reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-md border bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {review.user?.full_name || "Voyageur"}
                    </p>
                    {typeof review.rating === "number" ? (
                      <Badge variant="outline">{review.rating}/5</Badge>
                    ) : null}
                  </div>
                  {review.comment ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {review.comment}
                    </p>
                  ) : null}
                  {review.created_at ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(review.created_at) || review.created_at}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </CardContent>
    </Card>
  );
}
