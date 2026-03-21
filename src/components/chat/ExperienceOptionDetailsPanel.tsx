"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getIntlLocale } from "@/lib/i18n";

function toDisplayLabel(input: string): string {
  return input
    .replace(/^[^_]+_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getEquipmentLabel(key: string): string {
  return toDisplayLabel(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export interface ExperienceOptionDetailsData {
  option_type: "room" | "departure" | "session" | string;
  experience: {
    id: string;
    title: string;
    type?: string;
    city?: string | null;
    region?: string | null;
  };
  options: Record<string, unknown>[];
  query?: string | null;
  message?: string | null;
}

function createDateFormatter(locale: string) {
  return (value: unknown): string | null => {
    if (typeof value !== "string" || value.length === 0) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };
}

function createPriceFormatter(locale: string) {
  return (value: number | null) => {
    if (value === null) return null;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(value);
  };
}

function renderRoom(
  option: Record<string, unknown>,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatMad: (value: number | null) => string | null,
) {
  const id = asString(option.id) || "room";
  const name =
    asString(option.name) ||
    asString(option.room_type) ||
    t("chat.experienceDetails.roomFallback");
  const roomType = asString(option.room_type);
  const description = asString(option.description);
  const priceMad = asNumber(option.price_mad);
  const maxPersons = asNumber(option.max_persons);
  const beds = asNumber(option.capacity_beds);
  const totalRooms = asNumber(option.total_rooms);
  const availableRooms = asNumber(option.available_rooms);
  const equipments = asStringArray(option.equipments);

  return (
    <div
      key={id}
      className="rounded-md border bg-background/60 px-3 py-3 space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{name}</p>
        {priceMad !== null ? (
          <Badge variant="outline">
            {formatMad(priceMad)} · {t("chat.optionDetails.room.pricePerNight")}
          </Badge>
        ) : null}
      </div>

      {roomType ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.room.type", { value: roomType })}
        </p>
      ) : null}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}

      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
        {maxPersons !== null ? (
          <span>
            {t("chat.optionDetails.room.maxGuests", { count: maxPersons })}
          </span>
        ) : null}
        {beds !== null ? (
          <span>{t("chat.optionDetails.room.beds", { count: beds })}</span>
        ) : null}
        {totalRooms !== null ? (
          <span>
            {t("chat.optionDetails.room.stock", {
              available: availableRooms ?? "?",
              total: totalRooms,
            })}
          </span>
        ) : null}
      </div>

      {equipments.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {equipments.map((equipment) => (
            <Badge key={`${id}-${equipment}`} variant="secondary">
              {getEquipmentLabel(equipment)}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderDeparture(
  option: Record<string, unknown>,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatDateTime: (value: unknown) => string | null,
  formatMad: (value: number | null) => string | null,
) {
  const id = asString(option.id) || "departure";
  const departAt =
    formatDateTime(option.depart_at) || asString(option.depart_at) || "-";
  const returnAt =
    formatDateTime(option.return_at) || asString(option.return_at);
  const seatsAvailable = asNumber(option.seats_available);
  const seatsTotal = asNumber(option.seats_total);
  const priceMad = asNumber(option.price_mad);
  const status = asString(option.status);
  const notes = asString(option.guide_notes);

  return (
    <div
      key={id}
      className="rounded-md border bg-background/60 px-3 py-3 space-y-1"
    >
      <p className="text-sm font-medium">
        {t("chat.optionDetails.departure.depart", { value: departAt })}
      </p>
      {returnAt ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.departure.return", { value: returnAt })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("chat.optionDetails.departure.seats", {
          available: seatsAvailable ?? "?",
          total: seatsTotal ?? "?",
        })}
      </p>
      {priceMad !== null ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.departure.price", {
            value: formatMad(priceMad) ?? "",
          })}
        </p>
      ) : null}
      {status ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.departure.status", { value: status })}
        </p>
      ) : null}
      {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

function renderSession(
  option: Record<string, unknown>,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatDateTime: (value: unknown) => string | null,
  formatMad: (value: number | null) => string | null,
) {
  const id = asString(option.id) || "session";
  const startAt =
    formatDateTime(option.start_at) || asString(option.start_at) || "-";
  const endAt = formatDateTime(option.end_at) || asString(option.end_at);
  const capacityAvailable = asNumber(option.capacity_available);
  const capacityTotal = asNumber(option.capacity_total);
  const priceMad = asNumber(option.price_mad);
  const status = asString(option.status);
  const notes = asString(option.notes);

  return (
    <div
      key={id}
      className="rounded-md border bg-background/60 px-3 py-3 space-y-1"
    >
      <p className="text-sm font-medium">
        {t("chat.optionDetails.session.start", { value: startAt })}
      </p>
      {endAt ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.session.end", { value: endAt })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("chat.optionDetails.session.capacity", {
          available: capacityAvailable ?? "?",
          total: capacityTotal ?? "?",
        })}
      </p>
      {priceMad !== null ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.session.price", {
            value: formatMad(priceMad) ?? "",
          })}
        </p>
      ) : null}
      {status ? (
        <p className="text-xs text-muted-foreground">
          {t("chat.optionDetails.session.status", { value: status })}
        </p>
      ) : null}
      {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

export function ExperienceOptionDetailsPanel({
  details,
}: {
  details: ExperienceOptionDetailsData;
}) {
  const { locale, t } = useSiteI18n();
  const intlLocale = getIntlLocale(locale);
  const formatDateTime = createDateFormatter(intlLocale);
  const formatMad = createPriceFormatter(intlLocale);

  const location = [details.experience.city, details.experience.region]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(", ");

  const optionTypeLabel =
    details.option_type === "room"
      ? t("chat.optionDetails.type.room")
      : details.option_type === "departure"
        ? t("chat.optionDetails.type.departure")
        : details.option_type === "session"
          ? t("chat.optionDetails.type.session")
          : t("chat.optionDetails.type.option");

  const options = Array.isArray(details.options)
    ? details.options.filter((item): item is Record<string, unknown> =>
        isRecord(item),
      )
    : [];

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Badge variant="secondary">{optionTypeLabel}</Badge>
          <h4 className="text-base font-semibold">
            {details.experience.title}
          </h4>
          {location ? (
            <p className="text-xs text-muted-foreground">{location}</p>
          ) : null}
          {details.query ? (
            <p className="text-xs text-muted-foreground">
              {t("chat.optionDetails.filter", { query: details.query })}
            </p>
          ) : null}
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {details.message || t("chat.optionDetails.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {details.option_type === "room"
              ? options.map((option) => renderRoom(option, t, formatMad))
              : details.option_type === "departure"
                ? options.map((option) =>
                    renderDeparture(option, t, formatDateTime, formatMad),
                  )
                : options.map((option) =>
                    renderSession(option, t, formatDateTime, formatMad),
                  )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
