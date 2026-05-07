"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";

// Track which booking IDs have already had their modal auto-opened,
// so remounts don't re-trigger the loop.
const autoOpenedBookingIds = new Set<string>();

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useChatContext } from "@/contexts/ChatContext";
import { getIntlLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface BookingIntentSummary {
  booking_id: string;
  total_cents: number;
  currency: string;
  items: Array<{
    experience_title: string;
    experience_type?: string;
    from_date: string;
    to_date: string;
    adults: number;
    children?: number;
    infants?: number;
    nights?: number;
    rooms?: Array<{ room_type_id: string; quantity: number }>;
    subtotal_cents?: number;
    total_cents?: number;
  }>;
}

interface BookingConfirmCardProps {
  summary: BookingIntentSummary;
  conversationId?: string | null;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getCountLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  key: string,
  count: number,
) {
  return count === 1
    ? t(`${key}.one`, { count })
    : t(`${key}.other`, { count });
}

function BookingCheckoutModal({
  summary,
  open,
  onOpenChange,
  onConfirmed,
}: {
  summary: BookingIntentSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const { locale, t, dir } = useSiteI18n();
  const intlLocale = getIntlLocale(locale);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: "pending_host" })
        .eq("id", summary.booking_id);

      if (error) throw error;

      // Send notifications to host and guest
      try {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select(
            `
            id,
            host_id,
            guest_id,
            experience_id,
            experience:experiences(id, title),
            guest:profiles!bookings_guest_id_fkey(id, display_name)
          `,
          )
          .eq("id", summary.booking_id)
          .single();

        if (bookingData) {
          const experienceTitle =
            (bookingData.experience as unknown as { title?: string } | null)
              ?.title || "Experience";
          const guestName =
            (bookingData.guest as unknown as { display_name?: string } | null)
              ?.display_name || "A guest";

          // Notify host: new booking request
          if (bookingData.host_id) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                type: "booking_created",
                userId: bookingData.host_id,
                data: {
                  booking_id: bookingData.id,
                  experience_id: bookingData.experience_id,
                  entity_type: "booking",
                  entity_id: bookingData.id,
                },
                variables: {
                  user: guestName,
                  experience: experienceTitle,
                },
              },
            });
          }

          // Notify guest: booking request sent
          if (bookingData.guest_id) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                type: "booking_request",
                userId: bookingData.guest_id,
                data: {
                  booking_id: bookingData.id,
                  experience_id: bookingData.experience_id,
                  entity_type: "booking",
                  entity_id: bookingData.id,
                },
                variables: {
                  experience: experienceTitle,
                },
              },
            });
          }
        }
      } catch (notifyErr) {
        // Don't block the booking flow if notifications fail
        console.error("Failed to send booking notifications:", notifyErr);
      }

      setConfirmed(true);
      // Signal parent to lock conversation and close modal after a beat
      setTimeout(() => {
        onConfirmed();
        onOpenChange(false);
      }, 1800);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("chat.bookingConfirm.errorConfirm");
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={confirmed ? undefined : onOpenChange}>
      <DialogContent
        dir={dir}
        className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {confirmed
              ? t("chat.bookingConfirm.modal.successHeading")
              : t("chat.bookingConfirm.modal.title")}
          </DialogTitle>
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold text-base">
                {t("chat.bookingConfirm.modal.successTitle")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("chat.bookingConfirm.modal.successDescription")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.items.map((item) => (
              <div
                key={`${item.experience_title}:${item.from_date}:${item.to_date}:${item.adults}:${item.children ?? 0}:${item.infants ?? 0}`}
                className="space-y-3"
              >
                <div>
                  <p className="font-semibold text-base">
                    {item.experience_title}
                  </p>
                  {item.experience_type && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.experience_type}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <span>
                    {formatDate(item.from_date, intlLocale)}
                    {" → "}
                    {formatDate(item.to_date, intlLocale)}
                    {item.nights
                      ? ` (${getCountLabel(t, "chat.bookingConfirm.labels.night", item.nights)})`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {getCountLabel(
                      t,
                      "chat.bookingConfirm.labels.adult",
                      item.adults,
                    )}
                    {(item.children ?? 0) > 0
                      ? `, ${getCountLabel(
                          t,
                          "chat.bookingConfirm.labels.child",
                          item.children ?? 0,
                        )}`
                      : ""}
                    {(item.infants ?? 0) > 0
                      ? `, ${getCountLabel(
                          t,
                          "chat.bookingConfirm.labels.infant",
                          item.infants ?? 0,
                        )}`
                      : ""}
                  </span>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between items-center font-semibold text-base">
              <span>{t("chat.bookingConfirm.labels.total")}</span>
              <span>
                {formatPrice(summary.total_cents, summary.currency, intlLocale)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("chat.bookingConfirm.notice")}
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t("chat.bookingConfirm.back")}
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {t("chat.bookingConfirm.confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BookingConfirmCard({
  summary,
  conversationId,
}: BookingConfirmCardProps) {
  const { locale, t, dir } = useSiteI18n();
  const intlLocale = getIntlLocale(locale);
  const isRtl = dir === "rtl";
  const [modalOpen, setModalOpen] = useState(false);
  const {
    conversationId: contextConversationId,
    clientId,
    setLockedBookingId,
    setLockedConversationId,
  } = useChatContext();
  const mainItem = summary.items[0];

  // Auto-open the modal when the card first appears, but only once per booking ID
  // across all mounts/remounts to avoid the modal reopening in a loop.
  const bookingId = summary.booking_id;
  useEffect(() => {
    if (autoOpenedBookingIds.has(bookingId)) return;
    autoOpenedBookingIds.add(bookingId);
    const timer = setTimeout(() => setModalOpen(true), 400);
    return () => clearTimeout(timer);
  }, [bookingId]);

  const handleConfirmed = async () => {
    const activeConversationId = conversationId || contextConversationId;

    // Lock the conversation in the database so state persists across refreshes
    if (activeConversationId) {
      try {
        const clientIdFromStorage =
          typeof window !== "undefined"
            ? localStorage.getItem("okeyo_client_id")
            : null;
        const resolvedClientId = clientId || clientIdFromStorage;
        const params = new URLSearchParams();
        if (resolvedClientId) params.append("clientId", resolvedClientId);
        const suffix = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(
          `/api/conversations/${activeConversationId}${suffix}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking_id: summary.booking_id }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to persist conversation lock");
        }
      } catch (error) {
        console.error("Failed to persist conversation lock:", error);
        toast.warning(t("chat.bookingConfirm.persistLockWarning"));
      }
    }

    // Lock UI immediately via context
    if (activeConversationId) {
      setLockedConversationId(activeConversationId);
    }
    setLockedBookingId(summary.booking_id);
  };

  if (!mainItem) return null;

  const totalGuests =
    (mainItem.adults ?? 0) + (mainItem.children ?? 0) + (mainItem.infants ?? 0);

  return (
    <>
      <div
        dir={dir}
        className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 bg-primary/5 border-b flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm break-words">
              {mainItem.experience_title}
            </p>
            {mainItem.experience_type && (
              <p className="text-xs text-muted-foreground capitalize">
                {mainItem.experience_type}
              </p>
            )}
          </div>
          <span className="text-sm font-semibold text-primary shrink-0">
            {formatPrice(summary.total_cents, summary.currency, intlLocale)}
          </span>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>
              {formatDate(mainItem.from_date, intlLocale)} →{" "}
              {formatDate(mainItem.to_date, intlLocale)}
              {mainItem.nights
                ? ` · ${getCountLabel(
                    t,
                    "chat.bookingConfirm.labels.night",
                    mainItem.nights,
                  )}`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              {getCountLabel(
                t,
                "chat.bookingConfirm.labels.traveler",
                totalGuests,
              )}
            </span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button className="w-full gap-2" onClick={() => setModalOpen(true)}>
            {t("chat.bookingConfirm.cta")}
            <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
          </Button>
        </div>
      </div>

      <BookingCheckoutModal
        summary={summary}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirmed={handleConfirmed}
      />
    </>
  );
}
