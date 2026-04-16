"use client";

import {
  BookingCancellationDialog,
  type BookingCancellationPayload,
} from "@/components/booking/BookingCancellationDialog";
import { ReviewForm } from "@/components/experience/ReviewForm";
import { ReviewStars } from "@/components/experience/ReviewStars";
import { FooterSection } from "@/components/home/FooterSection";
import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useCancelBooking } from "@/hooks/use-booking-mutations";
import { useReviewForBooking } from "@/hooks/use-reviews";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import {
  isPayzoneSession,
  readPayzoneReturnParams,
  type PayzoneReturnStatus,
  type PayzoneSession,
} from "@/lib/payzone";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
    cancellation_policy: CancellationPolicy | null;
  } | null;
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

function openPayzonePaywall(session: PayzoneSession, target: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = session.paywallUrl;
  form.target = target;
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

function getCancellationPolicyInfo(
  policy: CancellationPolicy | null | undefined,
  fromDate: string,
  totalCents: number,
  currency: string,
) {
  const arrivalDate = parseDateOnly(fromDate);
  const arrivalLabel = formatLongDate(arrivalDate);
  const totalLabel = formatPrice(totalCents, currency);
  const now = new Date();

  if (policy === "free") {
    return {
      badge: "Annulation gratuite",
      policySummary: `Annulation sans frais jusqu'au ${arrivalLabel}.`,
      refundSummary:
        now < arrivalDate
          ? `Remboursement estimé à ${totalLabel} si vous annulez avant le début du séjour.`
          : "Le séjour a déjà commencé, aucun remboursement automatique n'est indiqué.",
    };
  }

  if (policy === "flexible") {
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

  if (policy === "strict") {
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

  if (policy === "non_refundable") {
    return {
      badge: "Non remboursable",
      policySummary:
        "Cette expérience ne prévoit pas de remboursement en cas d'annulation.",
      refundSummary:
        "Aucun remboursement n'est prévu par la politique de l'expérience.",
    };
  }

  if (policy === "moderate") {
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

  return {
    badge: "Politique standard",
    policySummary:
      "Les conditions d'annulation dépendent de l'expérience réservée.",
    refundSummary: `Montant de réservation estimé: ${totalLabel}.`,
  };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const bookingId = params?.bookingId as string;
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const cancelBookingMutation = useCancelBooking();
  const handledReturnKeyRef = useRef<string | null>(null);
  const pendingPaymentStorageKey = useMemo(
    () => `payzone:pending-payment:${bookingId}`,
    [bookingId],
  );
  const completedPaymentStorageKey = useMemo(
    () => `analytics:payment-completed:${bookingId}`,
    [bookingId],
  );

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
  const bookingReviewQuery = useReviewForBooking(user ? bookingId : null);

  const persistPendingPaymentId = useCallback(
    (paymentId: string) => {
      if (typeof window === "undefined") {
        return;
      }

      window.sessionStorage.setItem(pendingPaymentStorageKey, paymentId);
    },
    [pendingPaymentStorageKey],
  );

  const clearPendingPaymentId = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(pendingPaymentStorageKey);
    }
    setLastPaymentId(null);
  }, [pendingPaymentStorageKey]);

  const hasTrackedCompletedPayment = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(completedPaymentStorageKey) === "true";
  }, [completedPaymentStorageKey]);

  const markCompletedPaymentTracked = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(completedPaymentStorageKey, "true");
  }, [completedPaymentStorageKey]);

  const handleCheckPaymentStatus = useCallback(
    async (
      paymentIdOverride?: string | null,
      returnStatus?: PayzoneReturnStatus | null,
    ) => {
      const paymentId = paymentIdOverride ?? lastPaymentId;
      if (!paymentId) {
        toast.message("Aucun paiement en cours à vérifier.");
        return;
      }

      setIsCheckingPayment(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke(
          "get-payment-status",
          {
            body: { paymentId },
          },
        );

        if (error || !data) {
          throw new Error(
            error?.message ?? "Impossible de vérifier le paiement.",
          );
        }

        const status = (data as { status?: string }).status;

        if (status === "succeeded" || status === "confirmed") {
          clearPendingPaymentId();
          toast.success("Paiement confirmé.");
        } else if (status === "failed" || status === "cancelled") {
          clearPendingPaymentId();
          toast.error("Le paiement n'a pas abouti.");
        } else if (returnStatus === "success") {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.message("Paiement reçu, confirmation en cours.");
        } else if (returnStatus === "failure") {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.error("Le paiement a échoué. Vous pouvez réessayer.");
        } else {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.message(`Statut paiement: ${status ?? "pending"}`);
        }

        await queryClient.invalidateQueries({
          queryKey: ["bookings", user?.id],
        });
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
    },
    [
      clearPendingPaymentId,
      lastPaymentId,
      persistPendingPaymentId,
      queryClient,
      refetch,
      user?.id,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPaymentId = window.sessionStorage.getItem(
      pendingPaymentStorageKey,
    );

    if (storedPaymentId) {
      setLastPaymentId((current) => current ?? storedPaymentId);
    }
  }, [pendingPaymentStorageKey]);

  useEffect(() => {
    const { paymentId, status } = readPayzoneReturnParams(searchParams);

    if (!paymentId || !status) {
      return;
    }

    const handledKey = `${paymentId}:${status}`;
    if (handledReturnKeyRef.current === handledKey) {
      return;
    }

    handledReturnKeyRef.current = handledKey;
    setLastPaymentId(paymentId);
    persistPendingPaymentId(paymentId);

    if (status === "cancel") {
      clearPendingPaymentId();
      toast.message("Paiement annulé.");
      router.replace(pathname, { scroll: false });
      return;
    }

    void handleCheckPaymentStatus(paymentId, status).finally(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [
    clearPendingPaymentId,
    handleCheckPaymentStatus,
    pathname,
    persistPendingPaymentId,
    router,
    searchParams,
  ]);

  const guests = booking
    ? booking.adults + (booking.children ?? 0) + (booking.infants ?? 0)
    : 0;

  useEffect(() => {
    if (!booking) return;
    if (booking.status !== "confirmed" && booking.status !== "completed")
      return;
    if (hasTrackedCompletedPayment()) return;

    captureEvent(ANALYTICS_EVENT.PAYMENT_COMPLETED, {
      booking_id: booking.id,
      currency: booking.currency,
      experience_id: booking.experience?.id ?? null,
      experience_title: booking.experience?.title ?? null,
      experience_type: booking.experience?.type ?? null,
      guest_count: guests,
      method: "payzone",
      total_price: booking.price_total_cents,
    });
    markCompletedPaymentTracked();
  }, [
    booking,
    guests,
    hasTrackedCompletedPayment,
    markCompletedPaymentTracked,
  ]);

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
  const canPay = booking?.status === "approved";
  const canCancel = booking?.status
    ? CANCELLABLE_STATUSES.includes(booking.status)
    : false;
  const cancellationPolicyInfo = booking
    ? getCancellationPolicyInfo(
        booking.experience?.cancellation_policy,
        booking.from_date,
        booking.price_total_cents,
        booking.currency,
      )
    : null;

  const handleStartPayment = async () => {
    if (!booking) return;

    const payzoneWindowName = `payzone-checkout-${booking.id}`;
    const payzoneWindow =
      typeof window !== "undefined"
        ? window.open("", payzoneWindowName, "popup=yes,width=520,height=760")
        : null;

    if (payzoneWindow) {
      payzoneWindow.document.write(
        "<html><body style='font-family:system-ui;padding:24px'>Redirection vers Payzone...</body></html>",
      );
      payzoneWindow.document.close();
    }

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

      if (!isPayzoneSession(data)) {
        throw new Error("Réponse Payzone invalide.");
      }

      const session = data;
      setLastPaymentId(session.paymentId);
      persistPendingPaymentId(session.paymentId);
      captureEvent(ANALYTICS_EVENT.PAYMENT_INITIATED, {
        booking_id: booking.id,
        currency: booking.currency,
        experience_id: booking.experience?.id ?? null,
        experience_title: booking.experience?.title ?? null,
        experience_type: booking.experience?.type ?? null,
        guest_count: guests,
        method: "payzone",
        total_price: booking.price_total_cents,
      });
      openPayzonePaywall(session, payzoneWindow ? payzoneWindowName : "_self");
      toast.success(
        payzoneWindow
          ? "Page de paiement ouverte dans une nouvelle fenêtre."
          : "Redirection vers la page de paiement...",
      );
    } catch (err) {
      if (payzoneWindow && !payzoneWindow.closed) {
        payzoneWindow.close();
      }

      const message =
        err instanceof Error
          ? err.message
          : "Échec de l'initialisation du paiement.";
      toast.error(message);
    } finally {
      setIsStartingPayment(false);
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
        reason: reasonLabel ?? undefined,
        details: details || undefined,
      });

      clearPendingPaymentId();
      toast.success("Réservation annulée.");
      captureEvent(ANALYTICS_EVENT.BOOKING_CANCELLED, {
        booking_id: booking.id,
        reason: reason ?? "user_cancelled",
      });
      setIsCancelDialogOpen(false);
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
  const cancellationDateLabel = booking.cancelled_at
    ? new Date(booking.cancelled_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e]">
        <MarketingHeader className="mx-auto max-w-5xl" />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <div className="mb-6">
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to bookings
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {booking.experience?.title ?? "Booking Details"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/70">
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  <span>{booking.experience?.city ?? "Location"}</span>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/20 text-white bg-white/5"
                >
                  <StatusIcon className="size-3 mr-1.5" />
                  {statusMeta.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 flex-1">
        {booking.experience?.thumbnail_url && (
          <Card className="overflow-hidden">
            <div className="relative aspect-video sm:aspect-[21/9]">
              <Image
                src={booking.experience.thumbnail_url}
                alt={booking.experience.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <CalendarDays className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Dates</p>
                    <p className="text-muted-foreground">
                      {formatDateRange(booking.from_date, booking.to_date)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3 text-sm">
                  <Users className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Guests</p>
                    <p className="text-muted-foreground">
                      {guests} guest{guests > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      {formatPrice(
                        booking.price_subtotal_cents,
                        booking.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees</span>
                    <span>
                      {formatPrice(
                        booking.price_fees_cents ?? 0,
                        booking.currency,
                      )}
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
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>
                      {formatPrice(booking.price_total_cents, booking.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {cancellationPolicyInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="size-5" />
                    Cancellation Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {cancellationPolicyInfo.badge}
                    </Badge>
                    {booking.status === "cancelled" && cancellationDateLabel ? (
                      <Badge variant="destructive">
                        Cancelled on {cancellationDateLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>{cancellationPolicyInfo.policySummary}</p>
                    <p className="text-muted-foreground">
                      {cancellationPolicyInfo.refundSummary}
                    </p>
                  </div>
                  {booking.cancellation_reason ? (
                    <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                      <p className="font-medium text-foreground">
                        Cancellation reason
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {booking.cancellation_reason}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {(booking.guest_notes || booking.host_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booking.guest_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Your message
                      </p>
                      <p className="text-sm">{booking.guest_notes}</p>
                    </div>
                  )}
                  {booking.host_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Host message
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
                  <CardTitle>Your Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingReviewQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading review...
                    </div>
                  ) : bookingReviewQuery.data ? (
                    <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">Review submitted</p>
                        <ReviewStars
                          rating={bookingReviewQuery.data.ratingOverall}
                        />
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
                      Unable to find the experience for this booking.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canPay && (
                  <Button
                    onClick={handleStartPayment}
                    disabled={isStartingPayment}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isStartingPayment ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Pay Now
                  </Button>
                )}

                {lastPaymentId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleCheckPaymentStatus();
                    }}
                    disabled={isCheckingPayment}
                    className="w-full gap-2"
                  >
                    {isCheckingPayment ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Check Payment Status
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild className="w-full gap-2">
                    <Link href="/bookings">
                      <Home className="size-4" />
                      <span className="hidden sm:inline">Bookings</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full gap-2">
                    <Link href="/explore">
                      <MapPin className="size-4" />
                      <span className="hidden sm:inline">Explore</span>
                    </Link>
                  </Button>
                </div>

                {canCancel && (
                  <>
                    <Separator className="my-3" />
                    <Button
                      variant="destructive"
                      onClick={() => setIsCancelDialogOpen(true)}
                      disabled={cancelBookingMutation.isPending}
                      className="w-full gap-2"
                    >
                      {cancelBookingMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserMinus className="size-4" />
                      )}
                      Cancel Booking
                    </Button>
                  </>
                )}

                {(canPay || booking.status === "pending_payment") && (
                  <>
                    <Separator className="my-3" />
                    <PayzoneBadge
                      className="border-dashed"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <FooterSection />

      {cancellationPolicyInfo ? (
        <BookingCancellationDialog
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          onConfirm={handleCancelBooking}
          isLoading={cancelBookingMutation.isPending}
          policySummary={cancellationPolicyInfo.policySummary}
          refundSummary={cancellationPolicyInfo.refundSummary}
        />
      ) : null}
    </div>
  );
}
