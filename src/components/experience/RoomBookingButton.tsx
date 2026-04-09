"use client";

import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import type { ExperienceDetail } from "@/types/experience-detail";

interface RoomBookingButtonProps {
  experience: ExperienceDetail;
  roomId: string;
}

export function RoomBookingButton({ experience, roomId }: RoomBookingButtonProps) {
  const { openBooking, BookingModal } = useBooking();

  return (
    <>
      <Button
        size="sm"
        className="rounded-xl"
        onClick={() => openBooking(experience, roomId)}
      >
        Réserver
      </Button>
      <BookingModal />
    </>
  );
}
