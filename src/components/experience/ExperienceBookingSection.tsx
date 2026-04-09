"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBooking } from "@/hooks/use-booking";
import type { ExperienceDetail } from "@/types/experience-detail";

interface ExperienceBookingSectionProps {
  experience: ExperienceDetail;
  formattedPrice: string;
  nightsLabel: string;
}

export function ExperienceBookingSection({
  experience,
  formattedPrice,
  nightsLabel,
}: ExperienceBookingSectionProps) {
  const { openBooking, BookingModal } = useBooking();

  return (
    <>
      <Card className="rounded-3xl border-muted/60 shadow-lg shadow-black/5 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {experience.trip ? "Prochain départ" : "Tarif à partir de"}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {formattedPrice}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {nightsLabel}
                </span>
              </div>
            </div>
            <Button
              className="h-auto min-h-12 w-full rounded-2xl px-5 py-3 text-center text-sm font-semibold leading-tight whitespace-normal shadow-md transition-all hover:shadow-lg sm:w-auto sm:px-8 sm:whitespace-nowrap"
              onClick={() => openBooking(experience)}
            >
              Réserver cette expérience
            </Button>
          </div>
        </div>
      </Card>
      <BookingModal />
    </>
  );
}
