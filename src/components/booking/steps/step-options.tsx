"use client";

import { Check, Minus, Plus, Users } from "lucide-react";
import Image from "next/image";
import { useBookingContext } from "@/components/booking/booking-context";
import { useSiteI18n } from "@/components/site/site-i18n";
import { getIntlLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/functions";

export function StepOptions() {
  const { t } = useSiteI18n();
  const { experience } = useBookingContext();

  if (experience?.type === "trip") return <TripOptions />;
  if (experience?.type === "lodging") return <LodgingOptions />;

  return (
    <p className="text-center text-sm text-muted-foreground py-8">
      {t("booking.steps.options.noneAvailable")}
    </p>
  );
}

/* ─── Trip: departure selection ─────────────────────────────────── */

function TripOptions() {
  const { locale, t } = useSiteI18n();
  const { experience, departureId, setDepartureId } = useBookingContext();
  const departures = experience?.trip?.departures ?? [];
  const intlLocale = getIntlLocale(locale);

  if (departures.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {t("booking.steps.options.trip.noneAvailable")}
      </p>
    );
  }

  const currency = experience?.trip?.price_currency ?? "MAD";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("booking.steps.options.trip.select")}
      </p>
      {departures.map((dep) => {
        const selected = departureId === dep.id;
        const departDate = new Date(dep.depart_at);
        const returnDate = dep.return_at ? new Date(dep.return_at) : null;
        const soldOut = dep.seats_available === 0;

        return (
          <button
            key={dep.id}
            type="button"
            onClick={() => !soldOut && setDepartureId(dep.id)}
            disabled={soldOut}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:border-foreground/30 hover:bg-muted/40",
              soldOut && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-sm capitalize">
                  {departDate.toLocaleDateString(intlLocale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {returnDate && (
                  <p className="text-xs text-muted-foreground">
                    {t("booking.steps.options.trip.returns")}{" "}
                    {returnDate.toLocaleDateString(intlLocale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      dep.seats_available <= 3
                        ? "text-amber-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {soldOut
                      ? t("booking.steps.options.trip.soldOut")
                      : t("booking.steps.options.trip.seatsLeft", {
                          count: dep.seats_available,
                        })}
                  </span>
                  {dep.price_override_cents ? (
                    <span className="text-sm font-bold">
                      {new Intl.NumberFormat(intlLocale, {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                      }).format(dep.price_override_cents / 100)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("booking.steps.options.trip.standardPrice")}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30",
                )}
              >
                {selected && <Check className="h-3 w-3 text-white" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Lodging: room selection (multi-select with quantity steppers) ── */

function LodgingOptions() {
  const { locale, t } = useSiteI18n();
  const {
    experience,
    roomSelections,
    setRoomSelection,
    adults,
    children,
    infants,
  } = useBookingContext();
  const rooms = experience?.lodging?.rooms ?? [];
  const intlLocale = getIntlLocale(locale);

  if (rooms.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {t("booking.steps.options.lodging.noneAvailable")}
      </p>
    );
  }

  const calcInitialQty = (room: (typeof rooms)[0]) => {
    const forCapacity = Math.ceil(
      (adults + children) / (room.max_persons || 2),
    );
    return Math.max(infants, forCapacity, 1);
  };

  const totalGuests = adults + children + infants;
  const totalCapacity = roomSelections.reduce((sum, sel) => {
    const room = rooms.find((r) => r.id === sel.roomId);
    return sum + (room?.max_persons ?? 0) * sel.quantity;
  }, 0);
  const capacityShortfall = Math.max(0, totalGuests - totalCapacity);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("booking.steps.options.lodging.select")}
        {adults + children > 0 && (
          <span className="ml-1">
            (
            {t("booking.steps.options.lodging.guestCount", {
              count: adults + children,
            })}
            )
          </span>
        )}
      </p>

      {rooms.map((room) => {
        const selection = roomSelections.find((r) => r.roomId === room.id);
        const qty = selection?.quantity ?? 0;
        const selected = qty > 0;
        const roomImageUrl = room.photoUrls?.[0]
          ? getImageUrl(room.photoUrls[0])
          : null;

        return (
          <div
            key={room.id}
            onClick={() =>
              !selected && setRoomSelection(room.id, calcInitialQty(room))
            }
            className={cn(
              "w-full rounded-xl border text-left transition-all overflow-hidden",
              selected
                ? "border-primary ring-1 ring-primary"
                : "cursor-pointer hover:border-foreground/30",
            )}
          >
            {roomImageUrl && (
              <div className="relative h-36 w-full bg-muted">
                <Image
                  src={roomImageUrl}
                  alt={
                    room.name ?? t("booking.steps.options.lodging.roomFallback")
                  }
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {room.name ??
                      t("booking.steps.options.lodging.roomFallback")}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Users className="h-3 w-3" />
                    <span>
                      {t("booking.steps.options.lodging.upToGuests", {
                        count: room.max_persons,
                      })}
                    </span>
                  </div>
                </div>

                {selected ? (
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label={t("booking.steps.options.lodging.removeRoom")}
                      onClick={() => setRoomSelection(room.id, qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[3.5rem] text-center text-sm font-semibold">
                      {t("booking.steps.options.lodging.roomCount", {
                        count: qty,
                      })}
                    </span>
                    <button
                      type="button"
                      aria-label={t("booking.steps.options.lodging.addRoom")}
                      disabled={qty >= (room.total_rooms ?? Infinity)}
                      onClick={() => {
                        if (qty < (room.total_rooms ?? Infinity)) {
                          setRoomSelection(room.id, qty + 1);
                        }
                      }}
                      title={
                        qty >= (room.total_rooms ?? Infinity)
                          ? t("booking.steps.options.lodging.maxRoomsReached", {
                              count: room.total_rooms,
                            })
                          : undefined
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-base font-bold">
                  {new Intl.NumberFormat(intlLocale, {
                    style: "currency",
                    currency: room.currency,
                    maximumFractionDigits: 0,
                  }).format(room.price_cents / 100)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / {t("booking.steps.options.lodging.perNight")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {capacityShortfall > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t("booking.steps.options.lodging.insufficientCapacity", {
            remaining: capacityShortfall,
          })}
        </div>
      )}
    </div>
  );
}
