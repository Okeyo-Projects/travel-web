"use client";

import { BedDouble, Minus, Plus, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { getIntlLocale } from "@/lib/i18n";

export interface RoomTypeOptionItem {
  room_type_id: string;
  name: string;
  room_type?: string;
  description?: string | null;
  price_mad?: number | null;
  max_persons?: number | null;
  capacity_beds?: number | null;
  equipments?: string[];
  photos?: string[];
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

function getRoomLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  quantity: number,
) {
  return quantity === 1
    ? t("chat.roomSelector.room.one", { count: quantity })
    : t("chat.roomSelector.room.other", { count: quantity });
}

function joinSelectionParts(
  t: (key: string, values?: Record<string, string | number>) => string,
  parts: string[],
) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.join(t("chat.roomSelector.joiner"));
}

function buildBookingMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  experienceTitle: string | undefined,
  selections: Array<{ name: string; quantity: number }>,
) {
  const parts = selections.map(({ name, quantity }) => {
    const roomLabel = getRoomLabel(t, quantity);
    return `${quantity} ${roomLabel} "${name}"`;
  });

  const summary = joinSelectionParts(t, parts);
  if (!summary) return "";

  return experienceTitle
    ? t("chat.roomSelector.message.withExperience", {
        selection: summary,
        experience: experienceTitle,
      })
    : t("chat.roomSelector.message.withoutExperience", {
        selection: summary,
      });
}

export function RoomTypeSelector({
  question,
  experienceTitle,
  rooms,
  allowFreeText = true,
  disabled = false,
  onSelect,
}: RoomTypeSelectorProps) {
  const { locale, t } = useSiteI18n();
  const { openImageViewer, Viewer } = useImageViewer();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const isDisabled = disabled || !onSelect;
  const intlLocale = getIntlLocale(locale);

  const formatMad = (value: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(value);

  if (!question || rooms.length === 0) return null;

  const totalSelectedRooms = rooms.reduce(
    (sum, room) => sum + (quantities[room.room_type_id] ?? 0),
    0,
  );

  const handleQuantityChange = (roomTypeId: string, nextQuantity: number) => {
    setQuantities((current) => {
      const safeQuantity = Math.max(0, nextQuantity);
      if (safeQuantity === 0) {
        const { [roomTypeId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [roomTypeId]: safeQuantity,
      };
    });
  };

  const handleBook = () => {
    if (!onSelect) return;

    const selections = rooms
      .map((room) => ({
        name: room.name,
        quantity: quantities[room.room_type_id] ?? 0,
      }))
      .filter((room) => room.quantity > 0);

    const message = buildBookingMessage(t, experienceTitle, selections);
    if (!message) return;

    onSelect(message);
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm text-foreground">{question}</p>
        {experienceTitle ? (
          <p className="text-xs text-muted-foreground">{experienceTitle}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        {rooms.map((room) => {
          const quantity = quantities[room.room_type_id] ?? 0;
          const roomCountLabel = getRoomLabel(t, quantity || 1);
          const photos = room.photos ?? [];

          return (
            <div
              key={room.room_type_id}
              className="rounded-lg border bg-background/80 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex gap-3 min-w-0 w-full">
                {photos.length > 0 && (
                  <button
                    type="button"
                    className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted cursor-pointer"
                    onClick={() =>
                      openImageViewer(
                        photos,
                        0,
                        photos.map(() => room.name),
                      )
                    }
                  >
                    <Image
                      src={photos[0]}
                      alt={room.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{room.name}</p>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    {typeof room.price_mad === "number" ? (
                      <span>
                        {formatMad(room.price_mad)} ·{" "}
                        {t("chat.roomSelector.pricePerNight")}
                      </span>
                    ) : null}
                    {typeof room.max_persons === "number" ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {room.max_persons} {t("chat.roomSelector.guestAbbr")}
                      </span>
                    ) : null}
                    {typeof room.capacity_beds === "number" ? (
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        {room.capacity_beds} {t("chat.roomSelector.beds")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 sm:min-w-[140px]">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={isDisabled || quantity === 0}
                  onClick={() =>
                    handleQuantityChange(room.room_type_id, quantity - 1)
                  }
                  aria-label={`-${t("chat.roomSelector.counterLabel")}`}
                  className="h-9 w-9 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="min-w-[52px] text-center">
                  <p className="text-base font-semibold leading-none">
                    {quantity}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-1">
                    {roomCountLabel}
                  </p>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={isDisabled}
                  onClick={() =>
                    handleQuantityChange(room.room_type_id, quantity + 1)
                  }
                  aria-label={`+${t("chat.roomSelector.counterLabel")}`}
                  className="h-9 w-9 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {totalSelectedRooms > 0 ? (
        <div className="flex justify-end">
          <Button type="button" disabled={isDisabled} onClick={handleBook}>
            {t("chat.roomSelector.book")}
          </Button>
        </div>
      ) : null}

      {allowFreeText && (
        <p className="text-xs text-muted-foreground">
          {t("chat.roomSelector.freeText")}
        </p>
      )}
      {Viewer}
    </div>
  );
}
