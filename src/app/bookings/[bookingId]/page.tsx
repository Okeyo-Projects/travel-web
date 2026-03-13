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
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ReviewForm } from "@/components/experience/ReviewForm";
import { ReviewStars } from "@/components/experience/ReviewStars";
import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCancelBooking } from "@/hooks/use-booking-mutations";
import { useReviewForBooking } from "@/hooks/use-reviews";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import {
  isPayzoneSession,
  type PayzoneReturnStatus,
  type PayzoneSession,
  readPayzoneReturnParams,
} from "@/lib/payzone";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

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
    cancellation_policy:
      | Database["public"]["Enums"]["cancellation_policy"]
      | null;
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
  policy: Database["public"]["Enums"]["cancellation_policy"] | null | undefined,
  fromDate: string,
) {
  const policyLabelByType: Record<string, string> = {
    free: "Flexible",
    flexible: "Flexible",
    moderate: "Modérée",
    strict: "Stricte",
    non_refundable: "Non remboursable",
  };
  const normalizedPolicy = policy ?? "moderate";
  const bookingStart = new Date(`${fromDate}T00:00:00`);
  const now = new Date();
  const daysBeforeStart = Math.floor(
    (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  let estimate = "Montant remboursé selon conditions de l'hôte.";
  let details = "Les frais de plateforme peuvent rester non remboursables.";

  if (normalizedPolicy === "free") {
    estimate = "Remboursement estimé: 100% jusqu'à l'arrivée.";
    details = "Annulation gratuite tant que le séjour n'a pas commencé.";
  } else if (normalizedPolicy === "flexible") {
    if (daysBeforeStart >= 2) {
      estimate = "Remboursement estimé: 100%.";
    } else if (daysBeforeStart >= 1) {
      estimate = "Remboursement estimé: 50%.";
    } else {
      estimate = "Remboursement estimé: 0%.";
    }
    details =
      "Flexible: remboursement partiel possible à l'approche du séjour.";
  } else if (normalizedPolicy === "moderate") {
    if (daysBeforeStart >= 5) {
      estimate = "Remboursement estimé: 100%.";
    } else if (daysBeforeStart >= 1) {
      estimate = "Remboursement estimé: 50%.";
    } else {
      estimate = "Remboursement estimé: 0%.";
    }
    details = "Modérée: remboursement décroissant à l'approche du check-in.";
  } else if (normalizedPolicy === "strict") {
    if (daysBeforeStart >= 7) {
      estimate = "Remboursement estimé: 50%.";
    } else {
      estimate = "Remboursement estimé: 0%.";
    }
    details = "Stricte: annulation tardive généralement non remboursée.";
  } else if (normalizedPolicy === "non_refundable") {
    estimate = "Remboursement estimé: 0%.";
    details = "Tarif non remboursable.";
  }

  return {
    label: policyLabelByType[normalizedPolicy],
    estimate,
    details,
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
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelDetails, setCancelDetails] = useState("");
  const cancelBookingMutation = useCancelBooking();
  const handledReturnKeyRef = useRef<string | null>(null);
  const pendingPaymentStorageKey = useMemo(
    () => `payzone:pending-payment:${bookingId}`,
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
    ? ["pending_host", "pending_payment", "approved"].includes(booking.status)
    : false;
  const cancellationPolicyInfo = booking
    ? getCancellationPolicyInfo(
        booking.experience?.cancellation_policy,
        booking.from_date,
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
        method: "payzone",
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

  const handleCancelBooking = async () => {
    if (!booking || !user) return;

    const reasonLabelByValue: Record<string, string> = {
      changed_plans: "Changement de plans",
      found_alternative: "Alternative trouvée",
      price_too_high: "Prix trop élevé",
      personal_reasons: "Raisons personnelles",
      other: "Autre",
    };

    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: booking.id,
        guestId: user.id,
        reason: cancelReason ? reasonLabelByValue[cancelReason] : undefined,
        details: cancelDetails,
      });

      toast.success("Réservation annulée.");
      captureEvent(ANALYTICS_EVENT.BOOKING_CANCELLED, {
        booking_id: booking.id,
        reason: cancelReason || "user_cancelled",
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings", user.id] });
      await queryClient.invalidateQueries({
        queryKey: ["user-bookings", user.id],
      });
      setIsCancelDialogOpen(false);
      router.push("/bookings");
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

        {cancellationPolicyInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Politique d'annulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Politique appliquée:{" "}
                <span className="font-medium">
                  {cancellationPolicyInfo.label}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {cancellationPolicyInfo.details}
              </p>
              <p className="text-sm font-medium">
                {cancellationPolicyInfo.estimate}
              </p>
            </CardContent>
          </Card>
        )}

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
                  Impossible de retrouver l'expérience associée à cette
                  réservation.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {canPay && (
                <Button
                  onClick={handleStartPayment}
                  disabled={isStartingPayment}
                >
                  {isStartingPayment ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Payer maintenant
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  void handleCheckPaymentStatus();
                }}
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
                  onClick={() => setIsCancelDialogOpen(true)}
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
            </div>

            {(canPay || booking.status === "pending_payment") && (
              <PayzoneBadge
                title="Paiement securise avec Payzone"
                description="Le reglement s'effectue sur la page de paiement securisee de Payzone."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={(open) => {
          if (!cancelBookingMutation.isPending) {
            setIsCancelDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Votre réservation sera annulée
              immédiatement.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Raison (optionnel)</Label>
              <Select
                value={cancelReason || undefined}
                onValueChange={setCancelReason}
              >
                <SelectTrigger id="cancel-reason">
                  <SelectValue placeholder="Sélectionner une raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="changed_plans">
                    Changement de plans
                  </SelectItem>
                  <SelectItem value="found_alternative">
                    Alternative trouvée
                  </SelectItem>
                  <SelectItem value="price_too_high">
                    Prix trop élevé
                  </SelectItem>
                  <SelectItem value="personal_reasons">
                    Raisons personnelles
                  </SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-details">Détails (optionnel)</Label>
              <Textarea
                id="cancel-details"
                placeholder="Ajoutez un détail pour l'hôte (optionnel)."
                value={cancelDetails}
                onChange={(event) => setCancelDetails(event.target.value)}
                maxLength={300}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBookingMutation.isPending}>
              Garder la réservation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCancelBooking();
              }}
              disabled={cancelBookingMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBookingMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Annulation...
                </>
              ) : (
                "Annuler la réservation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
