"use client";

import { Check, Users } from "lucide-react";
import Image from "next/image";
import { useBookingContext } from "@/components/booking/booking-context";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/functions";

export function StepOptions() {
  const { experience } = useBookingContext();

  if (experience?.type === "trip") return <TripOptions />;
  if (experience?.type === "lodging") return <LodgingOptions />;

  return (
    <p className="text-center text-sm text-muted-foreground py-8">
      No options available for this experience type.
    </p>
  );
}

/* ─── Trip: departure selection ─────────────────────────────────── */

function TripOptions() {
  const { experience, departureId, setDepartureId } = useBookingContext();
  const departures = experience?.trip?.departures ?? [];

  if (departures.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No departures available at the moment.
      </p>
    );
  }

  const currency = experience?.trip?.price_currency ?? "MAD";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select the departure that works for you.
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
                  {departDate.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {returnDate && (
                  <p className="text-xs text-muted-foreground">
                    Returns:{" "}
                    {returnDate.toLocaleDateString("en-GB", {
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
                      ? "Sold out"
                      : `${dep.seats_available} seat${dep.seats_available !== 1 ? "s" : ""} left`}
                  </span>
                  {dep.price_override_cents ? (
                    <span className="text-sm font-bold">
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                      }).format(dep.price_override_cents / 100)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Standard price
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

/* ─── Lodging: room selection (single-select mode like mobile) ───── */

function LodgingOptions() {
  const {
    experience,
    roomSelections,
    setRoomSelection,
    adults,
    children,
    infants,
  } = useBookingContext();
  const rooms = experience?.lodging?.rooms ?? [];

  if (rooms.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No rooms available.
      </p>
    );
  }

  const selectedRoomId = roomSelections[0]?.roomId ?? null;

  const handleSelect = (roomId: string) => {
    if (selectedRoomId === roomId) {
      // Deselect
      setRoomSelection(roomId, 0);
      return;
    }

    // Calculate required quantity (matching mobile logic)
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const roomsForInfants = infants;
    const roomsForCapacity = Math.ceil(
      (adults + children) / (room.max_persons || 2),
    );
    const required = Math.max(roomsForInfants, roomsForCapacity, 1);

    // Clear previous selection and set new one (single-select)
    if (selectedRoomId) setRoomSelection(selectedRoomId, 0);
    setRoomSelection(roomId, required);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select the room type for your stay.
        {adults + children > 0 && (
          <span className="ml-1">
            ({adults + children} guest{adults + children !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      {rooms.map((room) => {
        const selected = selectedRoomId === room.id;
        const selection = roomSelections.find((r) => r.roomId === room.id);
        const qty = selection?.quantity ?? 0;
        const roomImageUrl = room.photoUrls?.[0]
          ? getImageUrl(room.photoUrls[0])
          : null;

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => handleSelect(room.id)}
            className={cn(
              "w-full rounded-xl border text-left transition-all overflow-hidden",
              selected
                ? "border-primary ring-1 ring-primary"
                : "hover:border-foreground/30",
            )}
          >
            {roomImageUrl && (
              <div className="relative h-36 w-full bg-muted">
                <Image
                  src={roomImageUrl}
                  alt={room.name ?? "Room"}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{room.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Users className="h-3 w-3" />
                    <span>Up to {room.max_persons} guests</span>
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

              <div className="flex items-center justify-between">
                <span className="text-base font-bold">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: room.currency,
                    maximumFractionDigits: 0,
                  }).format(room.price_cents / 100)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / night
                  </span>
                </span>
                {selected && qty > 1 && (
                  <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                    {qty} room{qty !== 1 ? "s" : ""} needed
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
