"use client";

import parse from "html-react-parser";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prepareExperienceRichText } from "@/lib/experience-rich-text";
import {
  type AppLocale,
  getIntlLocale,
  getLocalizedDescription,
  translateTag,
} from "@/lib/i18n";
import { getImageUrl } from "@/utils/functions";

type Primitive = string | number | boolean | null | undefined;

export interface ExperienceDetailsData {
  experience: {
    id: string;
    title: string;
    short_description?: string | null;
    long_description?: string | null;
    short_description_en?: string | null;
    short_description_fr?: string | null;
    short_description_ar?: string | null;
    long_description_en?: string | null;
    long_description_fr?: string | null;
    long_description_ar?: string | null;
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
    label_en?: string | null;
    label_ar?: string | null;
    category?: string;
  }>;
  services_included?: Array<{
    key?: string;
    label_fr?: string;
    label_en?: string | null;
    label_ar?: string | null;
    category?: string;
    notes?: string | null;
  }>;
  services_excluded?: Array<{
    key?: string;
    label_fr?: string;
    label_en?: string | null;
    label_ar?: string | null;
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

function toDisplayLabel(input: string): string {
  return input
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getLocalizedLabel(
  locale: AppLocale,
  item: {
    label_fr?: string;
    label_en?: string | null;
    label_ar?: string | null;
    key?: string;
  },
): string {
  const labels: Record<string, string | null | undefined> = {
    fr: item.label_fr,
    en: item.label_en,
    ar: item.label_ar,
  };
  const order: AppLocale[] = [locale, "fr", "en", "ar"];
  for (const l of order) {
    const val = labels[l];
    if (typeof val === "string" && val.length > 0) return val;
  }
  return item.key ?? "";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function ExpandableDescription({
  description,
  showMoreLabel,
  showLessLabel,
}: {
  description: string;
  showMoreLabel: string;
  showLessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // Split by one or more blank lines to identify paragraphs
  const paragraphs = description
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return null;
  if (paragraphs.length === 1) {
    return (
      <p className="text-sm text-muted-foreground">{paragraphs[0].trim()}</p>
    );
  }

  const firstParagraph = paragraphs[0].trim();
  const restParagraphs = paragraphs.slice(1).map((p) => p.trim());

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{firstParagraph}</p>
      {expanded &&
        restParagraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="text-sm text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-sm font-medium text-primary hover:underline underline-offset-2"
      >
        {expanded ? showLessLabel : showMoreLabel}
      </button>
    </div>
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
  const { locale, t } = useSiteI18n();
  const intlLocale = getIntlLocale(locale);

  const formatDateTime = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatMad = (value: number | null | undefined) => {
    if (typeof value !== "number") return null;
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrimitiveValue = (value: Primitive): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") {
      return value
        ? t("chat.experienceDetails.boolean.yes")
        : t("chat.experienceDetails.boolean.no");
    }
    return String(value);
  };

  const getDetailEntries = (
    source: Record<string, unknown> | null | undefined,
    ignoredKeys: string[] = [],
  ) => {
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
  };

  const experience = details.experience;
  const experienceType =
    experience.type === "lodging"
      ? t("chat.experienceDetails.type.lodging")
      : experience.type === "trip"
        ? t("chat.experienceDetails.type.trip")
        : experience.type === "activity"
          ? t("chat.experienceDetails.type.activity")
          : experience.type;
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
                  ? ` ${t("chat.experienceDetails.reviewCount", {
                      count: experience.reviews_count,
                    })}`
                  : ""}
              </Badge>
            ) : null}
            {typeof experience.bookings_count === "number" ? (
              <Badge variant="outline">
                {t("chat.experienceDetails.bookingsCount", {
                  count: experience.bookings_count,
                })}
              </Badge>
            ) : null}
          </div>

          <h3 className="text-xl font-semibold">{experience.title}</h3>
          {location ? (
            <p className="text-sm text-muted-foreground">{location}</p>
          ) : null}
          {(() => {
            const shortDesc = getLocalizedDescription(
              experience,
              locale,
              "short",
            );
            const longDesc = getLocalizedDescription(
              experience,
              locale,
              "long",
            );
            const longDescHtml = longDesc
              ? prepareExperienceRichText(longDesc).html
              : null;
            return (
              <>
                {shortDesc ? <p className="text-sm">{shortDesc}</p> : null}
                {longDescHtml ? (
                  <div className="text-sm text-muted-foreground leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h5]:mb-2 [&_h5]:text-base [&_h5]:font-semibold [&_h6]:mb-2 [&_h6]:text-sm [&_h6]:font-semibold [&_hr]:my-4 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc">
                    {parse(longDescHtml)}
                  </div>
                ) : null}
              </>
            );
          })()}

          {Array.isArray(experience.tags) && experience.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {experience.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {translateTag(tag, t)}
                </Badge>
              ))}
            </div>
          ) : null}

          {Array.isArray(experience.languages) &&
          experience.languages.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {experience.languages.map((lang) => (
                <Badge key={lang} variant="secondary">
                  {lang}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {details.host?.name ? (
          <Section title={t("chat.experienceDetails.host.title")}>
            <div className="rounded-md border bg-background/60 px-3 py-2 space-y-1">
              <p className="font-medium">{details.host.name}</p>
              {typeof details.host.avg_rating === "number" ? (
                <p className="text-xs text-muted-foreground">
                  {t("chat.experienceDetails.host.rating", {
                    value: details.host.avg_rating.toFixed(1),
                  })}
                </p>
              ) : null}
              {typeof details.host.total_bookings === "number" ? (
                <p className="text-xs text-muted-foreground">
                  {t("chat.experienceDetails.host.bookings", {
                    count: details.host.total_bookings,
                  })}
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
          <Section title={t("chat.experienceDetails.amenities")}>
            <div className="flex flex-wrap gap-1">
              {details.amenities.map((amenity) => {
                const label = getLocalizedLabel(locale, amenity);
                if (!label) return null;
                return (
                  <Badge
                    key={`${amenity.key ?? label}-${label}`}
                    variant="outline"
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </Section>
        ) : null}

        {Array.isArray(details.services_included) &&
        details.services_included.length > 0 ? (
          <Section title={t("chat.experienceDetails.servicesIncluded")}>
            <div className="space-y-1">
              {details.services_included.map((service) => (
                <p
                  key={`${service.key ?? service.label_fr ?? service.notes ?? "service"}`}
                  className="text-sm"
                >
                  • {getLocalizedLabel(locale, service)}
                  {service.notes ? ` — ${service.notes}` : ""}
                </p>
              ))}
            </div>
          </Section>
        ) : null}

        {Array.isArray(details.services_excluded) &&
        details.services_excluded.length > 0 ? (
          <Section title={t("chat.experienceDetails.servicesExcluded")}>
            <div className="space-y-1">
              {details.services_excluded.map((service) => (
                <p
                  key={`${service.key ?? service.label_fr ?? service.notes ?? "service"}`}
                  className="text-sm"
                >
                  • {getLocalizedLabel(locale, service)}
                  {service.notes ? ` — ${service.notes}` : ""}
                </p>
              ))}
            </div>
          </Section>
        ) : null}

        {experience.type === "lodging" ? (
          <Section title={t("chat.experienceDetails.rooms")}>
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
                        {room.name ||
                          room.type ||
                          t("chat.experienceDetails.roomFallback")}
                      </p>
                      {typeof room.price_mad === "number" ? (
                        <Badge variant="outline">
                          {formatMad(room.price_mad)} ·{" "}
                          {t("chat.experienceDetails.roomPricePerNight")}
                        </Badge>
                      ) : null}
                    </div>
                    {room.description ? (
                      <ExpandableDescription
                        description={room.description}
                        showMoreLabel={t("chat.experienceDetails.showMore")}
                        showLessLabel={t("chat.experienceDetails.showLess")}
                      />
                    ) : null}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {typeof room.max_persons === "number" ? (
                        <span>
                          {t("chat.experienceDetails.roomMaxGuests", {
                            count: room.max_persons,
                          })}
                        </span>
                      ) : null}
                      {typeof room.capacity_beds === "number" ? (
                        <span>
                          {t("chat.experienceDetails.roomBeds", {
                            count: room.capacity_beds,
                          })}
                        </span>
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
                {t("chat.experienceDetails.noRooms")}
              </p>
            )}
            <KeyValueGrid entries={lodgingEntries} />
          </Section>
        ) : null}

        {experience.type === "trip" ? (
          <Section title={t("chat.experienceDetails.trip")}>
            <KeyValueGrid entries={tripEntries} />

            {Array.isArray(details.itinerary) &&
            details.itinerary.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("chat.experienceDetails.itinerary")}
                </p>
                {details.itinerary.map((item) => (
                  <div
                    key={`${item.day_number ?? "day"}-${item.title ?? "step"}-${item.location_name ?? ""}`}
                    className="rounded-md border bg-background/60 px-3 py-2"
                  >
                    <p className="text-sm font-medium">
                      {t("chat.experienceDetails.dayTitle", {
                        day: item.day_number || "?",
                        title:
                          item.title ||
                          t("chat.experienceDetails.stepFallback"),
                      })}
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
                        {t("chat.experienceDetails.durationMinutes", {
                          count: item.duration_minutes,
                        })}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {Array.isArray(details.upcoming_departures) &&
            details.upcoming_departures.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("chat.experienceDetails.upcomingDepartures")}
                </p>
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
                      {t("chat.experienceDetails.seats", {
                        available: departure.seats_available ?? "?",
                        total: departure.seats_total ?? "?",
                      })}
                    </p>
                    {typeof departure.price_override_mad === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        {t("chat.experienceDetails.price", {
                          value: formatMad(departure.price_override_mad) ?? "",
                        })}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {experience.type === "activity" ? (
          <Section title={t("chat.experienceDetails.activity")}>
            <KeyValueGrid entries={activityEntries} />
            {Array.isArray(details.upcoming_sessions) &&
            details.upcoming_sessions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("chat.experienceDetails.upcomingSessions")}
                </p>
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
                        {t("chat.experienceDetails.end", {
                          value:
                            formatDateTime(session.end_at) || session.end_at,
                        })}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t("chat.experienceDetails.capacity", {
                        available: session.capacity_available ?? "?",
                        total: session.capacity_total ?? "?",
                      })}
                    </p>
                    {typeof session.price_override_mad === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        {t("chat.experienceDetails.price", {
                          value: formatMad(session.price_override_mad) ?? "",
                        })}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {promotionEntries.length > 0 ? (
          <Section title={t("chat.experienceDetails.promotions")}>
            <KeyValueGrid entries={promotionEntries} />
          </Section>
        ) : null}

        {Array.isArray(details.recent_reviews) &&
        details.recent_reviews.length > 0 ? (
          <Section title={t("chat.experienceDetails.recentReviews")}>
            <div className="space-y-2">
              {details.recent_reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-md border bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {review.user?.full_name ||
                        t("chat.experienceDetails.travelerFallback")}
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
