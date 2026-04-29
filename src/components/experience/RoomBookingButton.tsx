"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import type { ExperienceDetail } from "@/types/experience-detail";

interface RoomBookingButtonProps {
  experience: ExperienceDetail;
  roomId: string;
}

export function RoomBookingButton({ experience, roomId }: RoomBookingButtonProps) {
  const { t } = useSiteI18n();
  const { openBooking, BookingModal } = useBooking();

  return (
    <>
      <Button
        size="sm"
        className="rounded-xl"
        onClick={() => openBooking(experience, roomId)}
      >
        {t("experience.bookingSection.book")}
      </Button>
      <BookingModal />
    </>
  );
}
