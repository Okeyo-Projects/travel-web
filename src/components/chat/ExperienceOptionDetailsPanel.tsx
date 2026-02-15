"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

function formatDateTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

function renderRoom(option: Record<string, unknown>) {
  const id = asString(option.id) || "room";
  const name = asString(option.name) || asString(option.room_type) || "Room";
  const roomType = asString(option.room_type);
  const description = asString(option.description);
  const priceMad = asNumber(option.price_mad);
  const maxPersons = asNumber(option.max_persons);
  const beds = asNumber(option.capacity_beds);
  const totalRooms = asNumber(option.total_rooms);
  const availableRooms = asNumber(option.available_rooms);
  const equipments = asStringArray(option.equipments);

  return (
    <div key={id} className="rounded-md border bg-background/60 px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{name}</p>
        {priceMad !== null ? <Badge variant="outline">{priceMad} MAD / nuit</Badge> : null}
      </div>

      {roomType ? <p className="text-xs text-muted-foreground">Type: {roomType}</p> : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}

      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
        {maxPersons !== null ? <span>Max: {maxPersons} pers.</span> : null}
        {beds !== null ? <span>{beds} lits</span> : null}
        {totalRooms !== null ? (
          <span>
            Stock: {availableRooms ?? "?"}/{totalRooms}
          </span>
        ) : null}
      </div>

      {equipments.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {equipments.map((equipment) => (
            <Badge key={`${id}-${equipment}`} variant="secondary">
              {equipment}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderDeparture(option: Record<string, unknown>) {
  const id = asString(option.id) || "departure";
  const departAt = formatDateTime(option.depart_at) || asString(option.depart_at) || "-";
  const returnAt = formatDateTime(option.return_at) || asString(option.return_at);
  const seatsAvailable = asNumber(option.seats_available);
  const seatsTotal = asNumber(option.seats_total);
  const priceMad = asNumber(option.price_mad);
  const status = asString(option.status);
  const notes = asString(option.guide_notes);

  return (
    <div key={id} className="rounded-md border bg-background/60 px-3 py-3 space-y-1">
      <p className="text-sm font-medium">Depart: {departAt}</p>
      {returnAt ? <p className="text-xs text-muted-foreground">Retour: {returnAt}</p> : null}
      <p className="text-xs text-muted-foreground">
        Places: {seatsAvailable ?? "?"}/{seatsTotal ?? "?"}
      </p>
      {priceMad !== null ? <p className="text-xs text-muted-foreground">Prix: {priceMad} MAD</p> : null}
      {status ? <p className="text-xs text-muted-foreground">Statut: {status}</p> : null}
      {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

function renderSession(option: Record<string, unknown>) {
  const id = asString(option.id) || "session";
  const startAt = formatDateTime(option.start_at) || asString(option.start_at) || "-";
  const endAt = formatDateTime(option.end_at) || asString(option.end_at);
  const capacityAvailable = asNumber(option.capacity_available);
  const capacityTotal = asNumber(option.capacity_total);
  const priceMad = asNumber(option.price_mad);
  const status = asString(option.status);
  const notes = asString(option.notes);

  return (
    <div key={id} className="rounded-md border bg-background/60 px-3 py-3 space-y-1">
      <p className="text-sm font-medium">Session: {startAt}</p>
      {endAt ? <p className="text-xs text-muted-foreground">Fin: {endAt}</p> : null}
      <p className="text-xs text-muted-foreground">
        Capacite: {capacityAvailable ?? "?"}/{capacityTotal ?? "?"}
      </p>
      {priceMad !== null ? <p className="text-xs text-muted-foreground">Prix: {priceMad} MAD</p> : null}
      {status ? <p className="text-xs text-muted-foreground">Statut: {status}</p> : null}
      {notes ? <p className="text-sm text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

export function ExperienceOptionDetailsPanel({
  details,
}: {
  details: ExperienceOptionDetailsData;
}) {
  const location = [details.experience.city, details.experience.region]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  const optionTypeLabel =
    details.option_type === "room"
      ? "Details chambre"
      : details.option_type === "departure"
        ? "Details depart"
        : details.option_type === "session"
          ? "Details session"
          : "Details option";

  const options = Array.isArray(details.options)
    ? details.options.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Badge variant="secondary">{optionTypeLabel}</Badge>
          <h4 className="text-base font-semibold">{details.experience.title}</h4>
          {location ? <p className="text-xs text-muted-foreground">{location}</p> : null}
          {details.query ? (
            <p className="text-xs text-muted-foreground">Filtre: "{details.query}"</p>
          ) : null}
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {details.message || "Aucun detail trouve pour cette demande."}
          </p>
        ) : (
          <div className="space-y-2">
            {details.option_type === "room"
              ? options.map((option) => renderRoom(option))
              : details.option_type === "departure"
                ? options.map((option) => renderDeparture(option))
                : options.map((option) => renderSession(option))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
