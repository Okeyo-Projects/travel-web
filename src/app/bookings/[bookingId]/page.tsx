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
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
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
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const bookingId = params?.bookingId as string;
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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
          experience:experiences(id, title, city, thumbnail_url, type)
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
    ? ["pending_host", "pending_payment", "approved"].includes(booking.status)
    : false;

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

  const handleCancelBooking = async () => {
    if (!booking || !user) return;
    setIsCancelling(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .eq("guest_id", user.id);

      if (error) {
        throw error;
      }

      toast.success("Réservation annulée.");
      await queryClient.invalidateQueries({ queryKey: ["bookings", user.id] });
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d'annuler la réservation.";
      toast.error(message);
    } finally {
      setIsCancelling(false);
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
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? (
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
      </div>
    </div>
  );
}
