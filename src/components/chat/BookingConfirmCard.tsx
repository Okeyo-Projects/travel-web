"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
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
          : "Impossible de confirmer la réservation.";
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={confirmed ? undefined : onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {confirmed ? "Réservation envoyée !" : "Finaliser la réservation"}
          </DialogTitle>
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-semibold text-base">Demande envoyée</p>
              <p className="text-sm text-muted-foreground mt-1">
                L'hôte va examiner votre demande et vous répondre sous peu.
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
                    {formatDate(item.from_date)}
                    {" → "}
                    {formatDate(item.to_date)}
                    {item.nights
                      ? ` (${item.nights} nuit${item.nights > 1 ? "s" : ""})`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {item.adults} adulte{item.adults > 1 ? "s" : ""}
                    {(item.children ?? 0) > 0
                      ? `, ${item.children} enfant${(item.children ?? 0) > 1 ? "s" : ""}`
                      : ""}
                    {(item.infants ?? 0) > 0
                      ? `, ${item.infants} bébé${(item.infants ?? 0) > 1 ? "s" : ""}`
                      : ""}
                  </span>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between items-center font-semibold text-base">
              <span>Total</span>
              <span>{formatPrice(summary.total_cents, summary.currency)}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Votre réservation sera envoyée à l'hôte pour approbation. Aucun
              paiement ne sera prélevé maintenant.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Retour
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Confirmer
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
  const [modalOpen, setModalOpen] = useState(false);
  const {
    conversationId: contextConversationId,
    clientId,
    setLockedBookingId,
    setLockedConversationId,
  } = useChatContext();
  const mainItem = summary.items[0];

  // Auto-open the modal when the card first appears
  useEffect(() => {
    const timer = setTimeout(() => setModalOpen(true), 400);
    return () => clearTimeout(timer);
  }, []);

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
        toast.warning(
          "Réservation confirmée, mais la fermeture de conversation n'a pas été sauvegardée.",
        );
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
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
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
            {formatPrice(summary.total_cents, summary.currency)}
          </span>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>
              {formatDate(mainItem.from_date)} → {formatDate(mainItem.to_date)}
              {mainItem.nights
                ? ` · ${mainItem.nights} nuit${mainItem.nights > 1 ? "s" : ""}`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              {totalGuests} voyageur{totalGuests > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button className="w-full gap-2" onClick={() => setModalOpen(true)}>
            Finaliser la réservation
            <ArrowRight className="w-4 h-4" />
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
