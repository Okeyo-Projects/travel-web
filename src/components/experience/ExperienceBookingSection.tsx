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
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {experience.trip ? "Prochain départ" : "Tarif à partir de"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {formattedPrice}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {nightsLabel}
                </span>
              </div>
            </div>
            <Button
              className="h-12 px-8 text-sm font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all"
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
