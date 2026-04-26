"use client";

import { useBookingContext } from "@/components/booking/booking-context";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking } from "@/hooks/use-booking-mutations";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { getIntlLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
import posthog from "posthog-js";
import * as React from "react";
import { toast } from "sonner";

export function StepReview() {
  const { locale, t } = useSiteI18n();
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
  const noteTemplates = [
    t("booking.steps.review.noteTemplates.one"),
    t("booking.steps.review.noteTemplates.two"),
    t("booking.steps.review.noteTemplates.three"),
  ];

  const { mutateAsync: createBooking, isPending: isSubmitting } =
    useCreateBooking();
  const { user } = useAuth();
  const router = useRouter();
  const intlLocale = getIntlLocale(locale);

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
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: 0,
    }).format(amountCents / 100);
  };

  const handleSubmit = async () => {
    if (!experience || !quote) return;
    if (!experience.host?.id) return;
    if (!user?.id) {
      toast.error(t("booking.steps.review.loginRequired"));
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

      captureEvent(ANALYTICS_EVENT.BOOKING_SUBMITTED, {
        booking_id: booking?.id ?? null,
        currency: quote.currency,
        experience_id: experience.id,
        experience_title: experience.title,
        experience_type: experience.type,
        total_price: quote.total_cents,
        guest_count: adults + children + infants,
      });
      toast.success(t("booking.steps.review.successToast"));
      router.push(booking?.id ? `/bookings/${booking.id}` : "/bookings");
    } catch (error) {
      posthog.captureException(error, {
        event: ANALYTICS_EVENT.BOOKING_SUBMIT_FAILED,
        experience_id: experience?.id,
      });
      toast.error(t("booking.steps.review.errorToast"));
      console.error(error);
    }
  };

  // Format dates
  const dateStr = React.useMemo(() => {
    if (!startDate) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString(intlLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      return `${fmt(startDate)} → ${fmt(endDate)}`;
    }
    return fmt(startDate);
  }, [endDate, intlLocale, startDate]);

  // Format guest string
  const guestStr = React.useMemo(() => {
    const parts = [
      adults === 1
        ? t("chat.bookingConfirm.labels.adult.one", { count: adults })
        : t("chat.bookingConfirm.labels.adult.other", { count: adults }),
    ];
    if (children > 0)
      parts.push(
        children === 1
          ? t("chat.bookingConfirm.labels.child.one", { count: children })
          : t("chat.bookingConfirm.labels.child.other", { count: children }),
      );
    if (infants > 0)
      parts.push(
        infants === 1
          ? t("chat.bookingConfirm.labels.infant.one", { count: infants })
          : t("chat.bookingConfirm.labels.infant.other", { count: infants }),
      );
    return parts.join(", ");
  }, [adults, children, infants, t]);

  // Format rooms string for lodging
  const roomStr = React.useMemo(() => {
    if (!experience?.lodging || roomSelections.length === 0) return null;
    return roomSelections
      .map((r) => {
        const info = experience.lodging?.rooms.find(
          (room) => room.id === r.roomId,
        );
        return `${r.quantity} × ${info?.name ?? t("booking.steps.review.roomFallback")}`;
      })
      .join(", ");
  }, [experience, roomSelections, t]);

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
          <p className="text-sm font-medium">
            {t("booking.steps.review.messageToHost")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {noteTemplates.map((tpl) => (
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
          placeholder={t("booking.steps.review.notePlaceholder")}
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
                intlLocale,
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
                    intlLocale,
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
              {quote.message ?? t("booking.steps.review.promoDiscount")}
            </span>
            <span>−{formatCurrency(quote.discount_cents)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-bold text-base">
          <span>{t("booking.steps.review.total")}</span>
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
          {t("booking.steps.review.confirm")}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          {t("booking.steps.review.notice")}
        </p>
      </div>
{/* 
      <PayzoneBadge /> */}
    </div>
  );
}
