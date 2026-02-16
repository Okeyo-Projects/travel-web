"use client";

import {
  BedDouble,
  Calendar,
  Loader2,
  MessageSquare,
  Plane,
  Tag,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { useBookingContext } from "@/components/booking/booking-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking } from "@/hooks/use-booking-mutations";
import { cn } from "@/lib/utils";

const NOTE_TEMPLATES = [
  "Special occasion",
  "Traveling with children",
  "Early check-in requested",
];

export function StepReview() {
  const {
    experience,
    startDate,
    endDate,
    adults,
    children,
    infants,
    departureId,
    roomSelections,
    promoCode,
    guestNotes,
    setGuestNotes,
    quote,
    isLoadingQuote,
  } = useBookingContext();

  const [noteTemplate, setNoteTemplate] = React.useState<string | null>(null);

  const { mutateAsync: createBooking, isPending: isSubmitting } =
    useCreateBooking();
  const { user } = useAuth();
  const router = useRouter();

  const handleSelectTemplate = (template: string) => {
    if (noteTemplate === template) {
      setNoteTemplate(null);
      setGuestNotes("");
    } else {
      setNoteTemplate(template);
      setGuestNotes(template);
    }
  };

  const formatCurrency = (amountCents: number) => {
    if (!quote) return "";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: 0,
    }).format(amountCents / 100);
  };

  const handleSubmit = async () => {
    if (!experience || !quote) return;
    if (!experience.host?.id) return;
    if (!user?.id) {
      toast.error("Please log in to book.");
      return;
    }

    try {
      const booking = await createBooking({
        experienceId: experience.id,
        hostId: experience.host.id,
        guestId: user.id,
        fromDate: startDate?.toISOString().split("T")[0] ?? "",
        toDate:
          endDate?.toISOString().split("T")[0] ??
          startDate?.toISOString().split("T")[0] ??
          "",
        adults,
        children,
        infants,
        departureId,
        rooms: roomSelections.map((r) => ({
          room_type_id: r.roomId,
          quantity: r.quantity,
        })),
        guestNotes,
        subtotalCents: quote.subtotal_cents,
        feesCents: quote.fees_cents,
        taxesCents: quote.taxes_cents,
        totalCents: quote.total_cents,
        currency: quote.currency,
        metadata: {
          nights: quote.nights,
          experienceType: experience.type,
          promotionCode: promoCode,
        },
      });

      toast.success("Booking request sent!");
      router.push(booking?.id ? `/bookings/${booking.id}` : "/bookings");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    }
  };

  // Format dates
  const dateStr = React.useMemo(() => {
    if (!startDate) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      return `${fmt(startDate)} → ${fmt(endDate)}`;
    }
    return fmt(startDate);
  }, [startDate, endDate]);

  // Format guest string
  const guestStr = React.useMemo(() => {
    const parts = [`${adults} adult${adults !== 1 ? "s" : ""}`];
    if (children > 0)
      parts.push(`${children} child${children !== 1 ? "ren" : ""}`);
    if (infants > 0) parts.push(`${infants} infant${infants !== 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [adults, children, infants]);

  // Format rooms string for lodging
  const roomStr = React.useMemo(() => {
    if (!experience?.lodging || roomSelections.length === 0) return null;
    return roomSelections
      .map((r) => {
        const info = experience.lodging?.rooms.find(
          (room) => room.id === r.roomId,
        );
        return `${r.quantity} × ${info?.name ?? "Room"}`;
      })
      .join(", ");
  }, [experience, roomSelections]);

  // Format departure for trips
  const selectedDeparture = React.useMemo(() => {
    if (experience?.type !== "trip" || !departureId) return null;
    return (
      experience.trip?.departures.find((d) => d.id === departureId) ?? null
    );
  }, [experience, departureId]);

  if (!experience || !quote) return null;

  return (
    <div className="space-y-5">
      {/* ── Note templates ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Message to host</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {NOTE_TEMPLATES.map((tpl) => (
            <button
              key={tpl}
              type="button"
              onClick={() => handleSelectTemplate(tpl)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                noteTemplate === tpl
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {tpl}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Add a note for the host…"
          value={guestNotes}
          onChange={(e) => {
            setGuestNotes(e.target.value);
            if (noteTemplate && e.target.value !== noteTemplate) {
              setNoteTemplate(null);
            }
          }}
          className="resize-none h-24 text-sm"
        />
      </div>

      {/* ── Summary card ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-muted/40 border divide-y text-sm">
        {dateStr && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{dateStr}</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{guestStr}</span>
        </div>
        {roomStr && (
          <div className="flex items-center gap-3 px-4 py-3">
            <BedDouble className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{roomStr}</span>
          </div>
        )}
        {selectedDeparture && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {new Date(selectedDeparture.depart_at).toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )}
              {selectedDeparture.return_at && (
                <>
                  {" "}
                  →{" "}
                  {new Date(selectedDeparture.return_at).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Price breakdown ──────────────────────────────────────── */}
      <div className="space-y-2">
        {quote.breakdown.map((item) => (
          <div
            key={`${item.label}-${item.amount_cents}`}
            className="flex justify-between text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span>{formatCurrency(item.amount_cents)}</span>
          </div>
        ))}

        {quote.discount_cents > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {quote.message ?? "Promo discount"}
            </span>
            <span>−{formatCurrency(quote.discount_cents)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(quote.total_cents)}</span>
        </div>
      </div>

      {/* ── Confirm button ───────────────────────────────────────── */}
      <div className="pt-1">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingQuote}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Confirm booking
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          You won't be charged until the host accepts your request.
        </p>
      </div>
    </div>
  );
}
