"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookingCancellationDialog,
  type BookingCancellationPayload,
} from "@/components/booking/BookingCancellationDialog";
import { ReviewForm } from "@/components/experience/ReviewForm";
import { ReviewStars } from "@/components/experience/ReviewStars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useCancelBooking } from "@/hooks/use-booking-mutations";
import { useReviewForBooking } from "@/hooks/use-reviews";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type CancellationPolicy = Database["public"]["Enums"]["cancellation_policy"];

const CANCELLABLE_STATUSES: BookingStatus[] = [
  "pending_host",
  "approved",
  "pending_payment",
];

type BookingDetail = {
  id: string;
  from_date: string;
  to_date: string;
  adults: number;
  children: number | null;
  infants: number | null;
  price_subtotal_cents: number;
  price_fees_cents: number | null;
  price_taxes_cents: number | null;
  price_total_cents: number;
  currency: string;
  status: BookingStatus | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  guest_notes: string | null;
  host_notes: string | null;
  created_at: string;
  updated_at: string;
  experience: {
    id: string;
    title: string;
    city: string | null;
    thumbnail_url: string | null;
    type: string | null;
    cancellation_policy: CancellationPolicy;
  } | null;
};

type PayzoneSession = {
  paymentId: string;
  paywallUrl: string;
  payload: string;
  signature: string;
};

function formatDateRange(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return `${fromDate.toLocaleDateString("fr-FR", opts)} - ${toDate.toLocaleDateString("fr-FR", opts)}`;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function formatLongDate(value: Date) {
  return value.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCancellationPolicyInfo(
  policy: CancellationPolicy | null,
  fromDate: string,
  totalCents: number,
  currency: string,
) {
  const arrivalDate = parseDateOnly(fromDate);
  const arrivalLabel = formatLongDate(arrivalDate);
  const totalLabel = formatPrice(totalCents, currency);
  const now = new Date();

  switch (policy) {
    case "free":
      return {
        badge: "Annulation gratuite",
        policySummary: `Annulation sans frais jusqu'au ${arrivalLabel}.`,
        refundSummary:
          now < arrivalDate
            ? `Remboursement estimé à ${totalLabel} si vous annulez avant le début du séjour.`
            : "Le séjour a déjà commencé, aucun remboursement automatique n'est indiqué.",
      };
    case "flexible": {
      const deadline = subtractDays(arrivalDate, 1);
      const deadlineLabel = formatLongDate(deadline);

      return {
        badge: "Flexible (24 h)",
        policySummary:
          "Remboursement intégral si l'annulation intervient au moins 24 h avant l'arrivée.",
        refundSummary:
          now <= deadline
            ? `Remboursement estimé à ${totalLabel} si vous annulez avant le ${deadlineLabel}.`
            : `La fenêtre de remboursement intégral s'est terminée le ${deadlineLabel}.`,
      };
    }
    case "strict": {
      const deadline = subtractDays(arrivalDate, 14);
      const deadlineLabel = formatLongDate(deadline);

      return {
        badge: "Stricte (14 jours)",
        policySummary:
          "Remboursement intégral si l'annulation intervient au moins 14 jours avant l'arrivée.",
        refundSummary:
          now <= deadline
            ? `Remboursement estimé à ${totalLabel} si vous annulez avant le ${deadlineLabel}.`
            : `La fenêtre de remboursement intégral s'est terminée le ${deadlineLabel}.`,
      };
    }
    case "non_refundable":
      return {
        badge: "Non remboursable",
        policySummary:
          "Cette expérience ne prévoit pas de remboursement en cas d'annulation.",
        refundSummary:
          "Aucun remboursement n'est prévu par la politique de l'expérience.",
      };
    case "moderate":
    default: {
      const deadline = subtractDays(arrivalDate, 7);
      const deadlineLabel = formatLongDate(deadline);

      return {
        badge: "Modérée (7 jours)",
        policySummary:
          "Remboursement intégral si l'annulation intervient au moins 7 jours avant l'arrivée.",
        refundSummary:
          now <= deadline
            ? `Remboursement estimé à ${totalLabel} si vous annulez avant le ${deadlineLabel}.`
            : `La fenêtre de remboursement intégral s'est terminée le ${deadlineLabel}.`,
      };
    }
  }
}

function getStatusBadge(status: BookingStatus | null) {
  switch (status) {
    case "pending_host":
      return {
        label: "En attente d'approbation",
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "approved":
      return {
        label: "Approuvée, paiement requis",
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "pending_payment":
      return {
        label: "Paiement en cours",
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "confirmed":
      return {
        label: "Confirmée",
        variant: "default" as const,
        icon: CheckCircle2,
      };
    case "completed":
      return {
        label: "Terminée",
        variant: "outline" as const,
        icon: CheckCircle2,
      };
    case "declined":
      return {
        label: "Refusée",
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "cancelled":
      return {
        label: "Annulée",
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "refunded":
      return {
        label: "Remboursée",
        variant: "outline" as const,
        icon: CheckCircle2,
      };
    case "draft":
      return { label: "Brouillon", variant: "outline" as const, icon: Clock3 };
    default:
      return {
        label: status ?? "Inconnu",
        variant: "outline" as const,
        icon: Clock3,
      };
  }
}

function openPayzonePaywall(session: PayzoneSession) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = session.paywallUrl;
  form.target = "_blank";
  form.style.display = "none";

  const payloadField = document.createElement("input");
  payloadField.type = "hidden";
  payloadField.name = "payload";
  payloadField.value = session.payload;

  const signatureField = document.createElement("input");
  signatureField.type = "hidden";
  signatureField.name = "signature";
  signatureField.value = session.signature;

  form.appendChild(payloadField);
  form.appendChild(signatureField);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const cancelBookingMutation = useCancelBooking();
  const bookingId = params?.bookingId as string;
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);

  const {
    data: booking,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["booking-detail", bookingId, user?.id],
    enabled: Boolean(bookingId && user?.id),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("Utilisateur non authentifié.");
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          from_date,
          to_date,
          adults,
          children,
          infants,
          price_subtotal_cents,
          price_fees_cents,
          price_taxes_cents,
          price_total_cents,
          currency,
          status,
          cancellation_reason,
          cancelled_at,
          cancelled_by,
          guest_notes,
          host_notes,
          created_at,
          updated_at,
          experience:experiences(id, title, city, thumbnail_url, type, cancellation_policy)
        `,
        )
        .eq("id", bookingId)
        .eq("guest_id", user.id)
        .single();

      if (error) throw error;
      return data as BookingDetail;
    },
  });

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour accéder au détail de votre réservation.
            </p>
            <Button asChild>
              <Link href="/">Aller à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = getStatusBadge(booking?.status ?? null);
  const guests = booking
    ? booking.adults + (booking.children ?? 0) + (booking.infants ?? 0)
    : 0;

  const canPay = booking?.status === "approved";
  const canCancel = booking?.status
    ? CANCELLABLE_STATUSES.includes(booking.status)
    : false;
  const bookingReviewQuery = useReviewForBooking(booking?.id);

  const handleStartPayment = async () => {
    if (!booking) return;
    setIsStartingPayment(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "create-payzone-session",
        {
          body: { bookingId: booking.id },
        },
      );

      if (error || !data) {
        throw new Error(
          error?.message ?? "Impossible de démarrer le paiement.",
        );
      }

      const session = data as PayzoneSession;
      setLastPaymentId(session.paymentId);
      captureEvent(ANALYTICS_EVENT.PAYMENT_INITIATED, {
        booking_id: booking.id,
        method: "payzone",
      });
      openPayzonePaywall(session);
      toast.success("Page de paiement ouverte dans un nouvel onglet.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Échec de l'initialisation du paiement.";
      toast.error(message);
    } finally {
      setIsStartingPayment(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!lastPaymentId) {
      toast.message("Aucun paiement en cours à vérifier.");
      return;
    }
    setIsCheckingPayment(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "get-payment-status",
        {
          body: { paymentId: lastPaymentId },
        },
      );

      if (error || !data) {
        throw new Error(
          error?.message ?? "Impossible de vérifier le paiement.",
        );
      }

      const status = (data as { status?: string }).status;
      if (status === "succeeded" || status === "confirmed") {
        toast.success("Paiement confirmé.");
      } else {
        toast.message(`Statut paiement: ${status ?? "pending"}`);
      }

      await queryClient.invalidateQueries({ queryKey: ["bookings", user?.id] });
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur de vérification du paiement.";
      toast.error(message);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCancelBooking = async ({
    reason,
    reasonLabel,
    details,
  }: BookingCancellationPayload) => {
    if (!booking || !user) return;
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: booking.id,
        guestId: user.id,
        reason: reasonLabel,
        details,
      });

      setShowCancellationDialog(false);
      toast.success("Réservation annulée.");
      captureEvent(ANALYTICS_EVENT.BOOKING_CANCELLED, {
        booking_id: booking.id,
        reason: reason ?? "unspecified",
      });
      router.replace("/bookings");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d'annuler la réservation.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Réservation introuvable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cette réservation est introuvable ou vous n'avez pas accès.
            </p>
            <Button asChild>
              <Link href="/bookings">Retour aux réservations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusMeta.icon;
  const cancellationInfo = getCancellationPolicyInfo(
    booking.experience?.cancellation_policy ?? null,
    booking.from_date,
    booking.price_total_cents,
    booking.currency,
  );
  const cancellationDateLabel = booking.cancelled_at
    ? new Date(booking.cancelled_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {booking.experience?.title ?? "Détail réservation"}
            </h1>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin className="size-4" />
              <span>{booking.experience?.city ?? "Destination"}</span>
            </div>
          </div>
          <Badge variant={statusMeta.variant} className="gap-1.5">
            <StatusIcon className="size-3.5" />
            {statusMeta.label}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>{formatDateRange(booking.from_date, booking.to_date)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {guests} voyageur{guests > 1 ? "s" : ""}
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>
                  {formatPrice(booking.price_subtotal_cents, booking.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais</span>
                <span>
                  {formatPrice(booking.price_fees_cents ?? 0, booking.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span>
                  {formatPrice(
                    booking.price_taxes_cents ?? 0,
                    booking.currency,
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>
                  {formatPrice(booking.price_total_cents, booking.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Annulation et remboursement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{cancellationInfo.badge}</Badge>
              {booking.status === "cancelled" && cancellationDateLabel ? (
                <Badge variant="destructive">
                  Annulée le {cancellationDateLabel}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <p>{cancellationInfo.policySummary}</p>
              <p className="text-muted-foreground">
                {cancellationInfo.refundSummary}
              </p>
            </div>
            {booking.cancellation_reason ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">
                  Motif enregistré
                </p>
                <p className="mt-1 text-muted-foreground">
                  {booking.cancellation_reason}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {(booking.guest_notes || booking.host_notes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.guest_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Votre message
                  </p>
                  <p className="text-sm">{booking.guest_notes}</p>
                </div>
              )}
              {booking.host_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Message de l'hôte
                  </p>
                  <p className="text-sm">{booking.host_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {booking.status === "completed" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Votre avis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingReviewQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Chargement de votre avis...
                </div>
              ) : bookingReviewQuery.data ? (
                <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Avis déjà publié</p>
                    <ReviewStars rating={bookingReviewQuery.data.ratingOverall} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {bookingReviewQuery.data.text}
                  </p>
                </div>
              ) : booking.experience?.id ? (
                <ReviewForm
                  bookingId={booking.id}
                  experienceId={booking.experience.id}
                  onSuccess={() => {
                    refetch();
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Impossible de retrouver l'expérience associée à cette réservation.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {canPay && (
              <Button onClick={handleStartPayment} disabled={isStartingPayment}>
                {isStartingPayment ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Payer maintenant
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCheckPaymentStatus}
              disabled={!lastPaymentId || isCheckingPayment}
            >
              {isCheckingPayment ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Vérifier le paiement
            </Button>
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => setShowCancellationDialog(true)}
                disabled={cancelBookingMutation.isPending}
              >
                {cancelBookingMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Annuler la réservation
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href="/bookings">Retour</Link>
            </Button>
          </CardContent>
        </Card>

        <BookingCancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          onConfirm={handleCancelBooking}
          isLoading={cancelBookingMutation.isPending}
          policySummary={cancellationInfo.policySummary}
          refundSummary={cancellationInfo.refundSummary}
        />
      </div>
    </div>
  );
}
