"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { useBookingContext } from "@/components/booking/booking-context";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";

export function StepGuests() {
  const { t } = useSiteI18n();
  const { adults, children, infants, setGuests, experience, departureId } =
    useBookingContext();

  const maxGuests = React.useMemo(() => {
    if (!experience) return 10;
    if (experience.type === "trip") {
      if (departureId) {
        const dep = experience.trip?.departures.find(
          (d) => d.id === departureId,
        );
        return dep?.seats_available ?? experience.trip?.group_size_max ?? 10;
      }
      return experience.trip?.group_size_max ?? 10;
    }
    return 20; // lodging: no strict cap at guest step (capacity validated at options)
  }, [experience, departureId]);

  const totalGuests = adults + children + infants;

  const update = (type: "adults" | "children" | "infants", delta: number) => {
    const current =
      type === "adults" ? adults : type === "children" ? children : infants;
    const min = type === "adults" ? 1 : 0;
    if (delta > 0 && totalGuests >= maxGuests) return;
    setGuests(type, Math.max(min, current + delta));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {maxGuests < 20
          ? t("booking.steps.guests.maxGuests", { count: maxGuests })
          : t("booking.steps.guests.question")}
      </p>

      <div className="divide-y rounded-xl border">
        <GuestCounter
          label={t("booking.steps.guests.labels.adults")}
          description={t("booking.steps.guests.descriptions.adults")}
          value={adults}
          onIncrement={() => update("adults", 1)}
          onDecrement={() => update("adults", -1)}
          min={1}
          maxReached={totalGuests >= maxGuests}
        />
        <GuestCounter
          label={t("booking.steps.guests.labels.children")}
          description={t("booking.steps.guests.descriptions.children")}
          value={children}
          onIncrement={() => update("children", 1)}
          onDecrement={() => update("children", -1)}
          maxReached={totalGuests >= maxGuests}
        />
        <GuestCounter
          label={t("booking.steps.guests.labels.infants")}
          description={t("booking.steps.guests.descriptions.infants")}
          value={infants}
          onIncrement={() => update("infants", 1)}
          onDecrement={() => update("infants", -1)}
          maxReached={totalGuests >= maxGuests}
        />
      </div>

      {totalGuests >= maxGuests && (
        <p className="text-xs text-amber-600 text-center">
          {t("booking.steps.guests.maxReached", { count: maxGuests })}
        </p>
      )}
    </div>
  );
}

function GuestCounter({
  label,
  description,
  value,
  onIncrement,
  onDecrement,
  min = 0,
  maxReached,
}: {
  label: string;
  description: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  maxReached?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onDecrement}
          disabled={value <= min}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onIncrement}
          disabled={!!maxReached}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
