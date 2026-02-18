"use client";

import { BedDouble, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RoomTypeOptionItem {
  room_type_id: string;
  name: string;
  room_type?: string;
  description?: string | null;
  price_mad?: number | null;
  max_persons?: number | null;
  capacity_beds?: number | null;
  equipments?: string[];
  reply_text: string;
}

interface RoomTypeSelectorProps {
  question: string;
  experienceTitle?: string;
  rooms: RoomTypeOptionItem[];
  allowFreeText?: boolean;
  disabled?: boolean;
  onSelect?: (replyText: string) => void;
}

export function RoomTypeSelector({
  question,
  experienceTitle,
  rooms,
  allowFreeText = true,
  disabled = false,
  onSelect,
}: RoomTypeSelectorProps) {
  if (!question || rooms.length === 0) return null;

  return (
    <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm text-foreground">{question}</p>
        {experienceTitle ? (
          <p className="text-xs text-muted-foreground">{experienceTitle}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.room_type_id}
            className="rounded-lg border bg-background/80 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium truncate">{room.name}</p>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                {typeof room.price_mad === "number" ? (
                  <span>{room.price_mad} MAD / nuit</span>
                ) : null}
                {typeof room.max_persons === "number" ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {room.max_persons} pers.
                  </span>
                ) : null}
                {typeof room.capacity_beds === "number" ? (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3 w-3" />
                    {room.capacity_beds} lits
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !onSelect}
              onClick={() => onSelect?.(room.reply_text)}
              className="w-full sm:w-auto"
            >
              Choisir
            </Button>
          </div>
        ))}
      </div>

      {allowFreeText && (
        <p className="text-xs text-muted-foreground">
          Vous pouvez aussi indiquer un autre choix manuellement.
        </p>
      )}
    </div>
  );
}
