"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BedDouble,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  LayoutDashboard,
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
import {
  BookingCancellationDialog,
  type BookingCancellationPayload,
} from "@/components/booking/BookingCancellationDialog";
import { ReviewForm } from "@/components/experience/ReviewForm";
import { ReviewStars } from "@/components/experience/ReviewStars";
import { FooterSection } from "@/components/home/FooterSection";
import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { useSiteI18n } from "@/components/site/site-i18n";
import {
  AlertDialog,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useCancelBooking,
  useHostRespondToBooking,
} from "@/hooks/use-booking-mutations";
import { useReviewForBooking } from "@/hooks/use-reviews";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { getIntlLocale } from "@/lib/i18n";
import {
  isPayzoneSession,
  type PayzoneReturnStatus,
  type PayzoneSession,
  readPayzoneReturnParams,
} from "@/lib/payzone";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { getImageUrl } from "@/utils/functions";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type CancellationPolicy = Database["public"]["Enums"]["cancellation_policy"];

const CANCELLABLE_STATUSES: BookingStatus[] = [
  "pending_host",
  "approved",
  "pending_payment",
];

type ViewerRole = "guest" | "host";

type BookingDetail = {
  id: string;
  guest_id: string;
  host_id: string;
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
  rooms: Database["public"]["Tables"]["bookings"]["Row"]["rooms"];
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  guest: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  experience: {
    id: string;
    title: string;
    city: string | null;
    thumbnail_url: string | null;
    type: string | null;
    cancellation_policy: CancellationPolicy | null;
  } | null;
};

type RoomEntry = { room_type_id: string; quantity: number };

type RoomDetail = {
  id: string;
  name: string | null;
  photos: string[] | null;
  price_cents: number;
  currency: string;
  capacity_beds: number;
  max_persons: number;
  room_type: Database["public"]["Enums"]["room_type"];
};

function formatDateRange(from: string, to: string, locale: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return `${fromDate.toLocaleDateString(locale, opts)} - ${toDate.toLocaleDateString(locale, opts)}`;
}

function formatPrice(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
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

function formatLongDate(value: Date, locale: string) {
  return value.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBookingTimestamp(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(
  status: BookingStatus | null,
  t: ReturnType<typeof useSiteI18n>["t"],
  viewerRole: ViewerRole = "guest",
) {
  switch (status) {
    case "pending_host":
      return {
        label:
          viewerRole === "host"
            ? t("booking.detail.status.pendingHost.host")
            : t("booking.detail.status.pendingHost.guest"),
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "approved":
      return {
        label:
          viewerRole === "host"
            ? t("booking.detail.status.approved.host")
            : t("booking.detail.status.approved.guest"),
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "pending_payment":
      return {
        label:
          viewerRole === "host"
            ? t("booking.detail.status.pendingPayment.host")
            : t("booking.detail.status.pendingPayment.guest"),
        variant: "secondary" as const,
        icon: Clock3,
      };
    case "confirmed":
      return {
        label: t("booking.detail.status.confirmed"),
        variant: "default" as const,
        icon: CheckCircle2,
      };
    case "completed":
      return {
        label: t("booking.detail.status.completed"),
        variant: "outline" as const,
        icon: CheckCircle2,
      };
    case "declined":
      return {
        label: t("booking.detail.status.declined"),
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "cancelled":
      return {
        label: t("booking.detail.status.cancelled"),
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "refunded":
      return {
        label: t("booking.detail.status.refunded"),
        variant: "outline" as const,
        icon: CheckCircle2,
      };
    case "draft":
      return {
        label: t("booking.detail.status.draft"),
        variant: "outline" as const,
        icon: Clock3,
      };
    default:
      return {
        label: status ?? t("booking.detail.status.unknown"),
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
  locale: string,
  t: ReturnType<typeof useSiteI18n>["t"],
) {
  const arrivalDate = parseDateOnly(fromDate);
  const arrivalLabel = formatLongDate(arrivalDate, locale);
  const totalLabel = formatPrice(totalCents, currency, locale);
  const now = new Date();

  if (policy === "free") {
    return {
      badge: t("booking.detail.cancellation.badge.free"),
      policySummary: t("booking.detail.cancellation.summary.free", {
        date: arrivalLabel,
      }),
      refundSummary:
        now < arrivalDate
          ? t("booking.detail.cancellation.refund.freeActive", {
              amount: totalLabel,
            })
          : t("booking.detail.cancellation.refund.started"),
    };
  }

  if (policy === "flexible") {
    const deadline = subtractDays(arrivalDate, 1);
    const deadlineLabel = formatLongDate(deadline, locale);

    return {
      badge: t("booking.detail.cancellation.badge.flexible"),
      policySummary: t("booking.detail.cancellation.summary.flexible"),
      refundSummary:
        now <= deadline
          ? t("booking.detail.cancellation.refund.beforeDeadline", {
              amount: totalLabel,
              date: deadlineLabel,
            })
          : t("booking.detail.cancellation.refund.deadlinePassed", {
              date: deadlineLabel,
            }),
    };
  }

  if (policy === "strict") {
    const deadline = subtractDays(arrivalDate, 14);
    const deadlineLabel = formatLongDate(deadline, locale);

    return {
      badge: t("booking.detail.cancellation.badge.strict"),
      policySummary: t("booking.detail.cancellation.summary.strict"),
      refundSummary:
        now <= deadline
          ? t("booking.detail.cancellation.refund.beforeDeadline", {
              amount: totalLabel,
              date: deadlineLabel,
            })
          : t("booking.detail.cancellation.refund.deadlinePassed", {
              date: deadlineLabel,
            }),
    };
  }

  if (policy === "non_refundable") {
    return {
      badge: t("booking.detail.cancellation.badge.nonRefundable"),
      policySummary: t("booking.detail.cancellation.summary.nonRefundable"),
      refundSummary: t("booking.detail.cancellation.refund.none"),
    };
  }

  if (policy === "moderate") {
    const deadline = subtractDays(arrivalDate, 7);
    const deadlineLabel = formatLongDate(deadline, locale);

    return {
      badge: t("booking.detail.cancellation.badge.moderate"),
      policySummary: t("booking.detail.cancellation.summary.moderate"),
      refundSummary:
        now <= deadline
          ? t("booking.detail.cancellation.refund.beforeDeadline", {
              amount: totalLabel,
              date: deadlineLabel,
            })
          : t("booking.detail.cancellation.refund.deadlinePassed", {
              date: deadlineLabel,
            }),
    };
  }

  return {
    badge: t("booking.detail.cancellation.badge.standard"),
    policySummary: t("booking.detail.cancellation.summary.standard"),
    refundSummary: t("booking.detail.cancellation.refund.standard", {
      amount: totalLabel,
    }),
  };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useSiteI18n();
  const bookingId = params?.bookingId as string;
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isHostResponseDialogOpen, setIsHostResponseDialogOpen] =
    useState(false);
  const [hostResponseMode, setHostResponseMode] = useState<
    "approved" | "declined"
  >("approved");
  const [hostResponseNote, setHostResponseNote] = useState("");
  const [selectedHostTemplate, setSelectedHostTemplate] = useState<
    string | null
  >(null);
  const cancelBookingMutation = useCancelBooking();
  const hostRespondMutation = useHostRespondToBooking();
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
        throw new Error("User not authenticated.");
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
           guest_id,
           host_id,
           from_date,
           to_date,
           adults,
           children,
           infants,
           rooms,
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
           responded_at,
           guest:profiles!bookings_guest_id_fkey(id, display_name, avatar_url),
           experience:experiences(id, title, city, thumbnail_url, type, cancellation_policy)
        `,
        )
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      return data as BookingDetail;
    },
  });
  const isGuestView = Boolean(user && booking?.guest_id === user.id);
  const isHostView = Boolean(booking && !isGuestView);
  const viewerRole: ViewerRole = isHostView ? "host" : "guest";
  const bookingReviewQuery = useReviewForBooking(
    isGuestView ? bookingId : null,
  );

  const parsedRooms: RoomEntry[] = useMemo(() => {
    if (!booking?.rooms) return [];
    try {
      const parsed =
        typeof booking.rooms === "string"
          ? JSON.parse(booking.rooms)
          : booking.rooms;
      if (Array.isArray(parsed)) return parsed as RoomEntry[];
      return [];
    } catch {
      return [];
    }
  }, [booking?.rooms]);

  const { data: roomDetails } = useQuery({
    queryKey: [
      "booking-room-details",
      bookingId,
      parsedRooms.map((r) => r.room_type_id).join(","),
    ],
    enabled: parsedRooms.length > 0,
    queryFn: async () => {
      const supabase = createClient();
      const ids = parsedRooms.map((r) => r.room_type_id);
      const { data, error } = await supabase
        .from("lodging_room_types")
        .select(
          "id, name, photos, price_cents, currency, capacity_beds, max_persons, room_type",
        )
        .in("id", ids);
      if (error) throw error;
      return (data ?? []) as RoomDetail[];
    },
  });

  const roomDisplayList = useMemo(() => {
    if (parsedRooms.length === 0 || !roomDetails) return [];
    return parsedRooms
      .map((entry) => {
        const detail = roomDetails.find((d) => d.id === entry.room_type_id);
        if (!detail) return null;
        return { ...detail, quantity: entry.quantity };
      })
      .filter(Boolean) as (RoomDetail & { quantity: number })[];
  }, [parsedRooms, roomDetails]);

  const isLodging = booking?.experience?.type === "lodging";

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
        toast.message(t("bookings.detail.toast.noPayment"));
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
            error?.message ?? t("bookings.detail.toast.checkPaymentError"),
          );
        }

        const status = (data as { status?: string }).status;

        if (status === "succeeded" || status === "confirmed") {
          clearPendingPaymentId();
          toast.success(t("bookings.detail.toast.paymentConfirmed"));
        } else if (status === "failed" || status === "cancelled") {
          clearPendingPaymentId();
          toast.error(t("bookings.detail.toast.paymentFailed"));
        } else if (returnStatus === "success") {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.message(t("bookings.detail.toast.paymentPending"));
        } else if (returnStatus === "failure") {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.error(t("bookings.detail.toast.paymentRetry"));
        } else {
          setLastPaymentId(paymentId);
          persistPendingPaymentId(paymentId);
          toast.message(
            t("bookings.detail.toast.paymentUnknown", {
              status: status ?? "pending",
            }),
          );
        }

        await queryClient.invalidateQueries({
          queryKey: ["bookings", user?.id],
        });
        await refetch();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("bookings.detail.toast.checkError");
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
      t,
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
      toast.message("Payment cancelled.");
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
    if (!booking || !isGuestView) return;
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
    isGuestView,
    markCompletedPaymentTracked,
  ]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>{t("bookings.detail.authRequired")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("bookings.detail.authRequiredDesc")}
            </p>
            <Button asChild>
              <Link href="/">{t("bookings.detail.goHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMeta = getStatusBadge(booking?.status ?? null, t, viewerRole);
  const canPay = isGuestView && booking?.status === "approved";
  const canCancel =
    isGuestView && booking?.status
      ? CANCELLABLE_STATUSES.includes(booking.status)
      : false;
  const canHostRespond = isHostView && booking?.status === "pending_host";
  const cancellationPolicyInfo = booking
    ? getCancellationPolicyInfo(
        booking.experience?.cancellation_policy,
        booking.from_date,
        booking.price_total_cents,
        booking.currency,
        locale,
        t,
      )
    : null;
  const hostResponseTemplates =
    hostResponseMode === "approved"
      ? [
          t("bookings.detail.templates.accept.one"),
          t("bookings.detail.templates.accept.two"),
          t("bookings.detail.templates.accept.three"),
        ]
      : [
          t("bookings.detail.templates.decline.one"),
          t("bookings.detail.templates.decline.two"),
          t("bookings.detail.templates.decline.three"),
        ];
  const backHref = isHostView ? "/host" : "/bookings";
  const backLabel = isHostView
    ? t("bookings.detail.backToDashboard")
    : t("bookings.detail.backToBookings");
  const requestDateLabel = booking
    ? formatBookingTimestamp(booking.created_at, locale)
    : null;
  const responseDateLabel = booking?.responded_at
    ? formatBookingTimestamp(booking.responded_at, locale)
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
        "<html><body style='font-family:system-ui;padding:24px'>Redirecting to payment...</body></html>",
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
          error?.message ?? t("bookings.detail.toast.startPaymentError"),
        );
      }

      if (!isPayzoneSession(data)) {
        throw new Error(t("bookings.detail.toast.invalidPaymentResponse"));
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
      toast.success(t("bookings.detail.toast.paymentPending"));
    } catch (err) {
      if (payzoneWindow && !payzoneWindow.closed) {
        payzoneWindow.close();
      }

      const message =
        err instanceof Error
          ? err.message
          : t("bookings.detail.toast.startPaymentError");
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
      toast.success(t("bookings.detail.toast.cancelSuccess"));
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
          : t("bookings.detail.toast.cancelError");
      toast.error(message);
    }
  };

  const handleOpenHostResponse = (mode: "approved" | "declined") => {
    setHostResponseMode(mode);
    setHostResponseNote("");
    setSelectedHostTemplate(null);
    setIsHostResponseDialogOpen(true);
  };

  const handleConfirmHostResponse = async () => {
    if (!booking || !canHostRespond) return;

    try {
      await hostRespondMutation.mutateAsync({
        bookingId: booking.id,
        hostId: booking.host_id,
        response: hostResponseMode,
        message: hostResponseNote.trim() || selectedHostTemplate || undefined,
        template: selectedHostTemplate ?? undefined,
      });

      setIsHostResponseDialogOpen(false);
      toast.success(
        hostResponseMode === "approved"
          ? t("bookings.detail.toast.approveSuccess")
          : t("bookings.detail.toast.declineSuccess"),
      );
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("bookings.detail.toast.updateError");
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
            <CardTitle>{t("bookings.detail.notFound")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("bookings.detail.notFoundDesc")}
            </p>
            <Button asChild>
              <Link href="/bookings">
                {t("bookings.detail.backToBookings")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusMeta.icon;
  const cancellationDateLabel = booking.cancelled_at
    ? new Date(booking.cancelled_at).toLocaleDateString(getIntlLocale(locale), {
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
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {booking.experience?.title ?? "Booking"}
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
        {/* {(() => {
          const thumbnailUrl = booking.experience?.thumbnail_url ? getImageUrl(booking.experience?.thumbnail_url): null;
          return thumbnailUrl ? (
            <Card className="overflow-hidden">
              <div className="relative aspect-video sm:aspect-[21/9]">
                <Image
                  src={thumbnailUrl}
                  alt={booking?.experience?.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </Card>
          ) : null;
        })()} */}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {isHostView && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    {t("bookings.detail.guestRequest")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <Users className="size-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("bookings.detail.guest")}
                      </p>
                      <p className="text-muted-foreground">
                        {booking.guest?.display_name ??
                          t("bookings.detail.guest")}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3 text-sm">
                    <CalendarDays className="size-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("bookings.detail.requestedOn")}
                      </p>
                      <p className="text-muted-foreground">
                        {requestDateLabel}
                      </p>
                    </div>
                  </div>
                  {responseDateLabel ? (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="size-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">
                            {t("bookings.detail.respondedOn")}
                          </p>
                          <p className="text-muted-foreground">
                            {responseDateLabel}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            )}

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
                    <p className="font-medium">{t("bookings.detail.dates")}</p>
                    <p className="text-muted-foreground">
                      {formatDateRange(
                        booking.from_date,
                        booking.to_date,
                        locale,
                      )}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3 text-sm">
                  <Users className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{t("bookings.detail.guests")}</p>
                    <p className="text-muted-foreground">
                      {t("bookings.detail.guestCount", { count: guests })}
                    </p>
                  </div>
                </div>
                {isLodging && roomDisplayList.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3 text-sm">
                      <BedDouble className="size-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {t("booking.steps.review.rooms")}
                        </p>
                        <div className="space-y-3 mt-2">
                          {roomDisplayList.map((room) => {
                            const photoUrl = room.photos?.[0]
                              ? getImageUrl(room.photos[0])
                              : null;
                            return (
                              <div
                                key={room.id}
                                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2"
                              >
                                {photoUrl ? (
                                  <div className="relative size-14 shrink-0 rounded-md overflow-hidden bg-muted">
                                    <Image
                                      src={photoUrl}
                                      alt={room.name ?? "Room"}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                                    <BedDouble className="size-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {room.name ?? "Room"}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>
                                      {room.capacity_beds}{" "}
                                      {room.capacity_beds > 1
                                        ? t("bookings.detail.beds")
                                        : t("bookings.detail.bed")}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      {room.max_persons}{" "}
                                      {room.max_persons > 1
                                        ? t("bookings.detail.guestsUnit")
                                        : t("bookings.detail.guestUnit")}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold">
                                    x{room.quantity}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {isLodging && parsedRooms.length === 0 && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3 text-sm">
                      <BedDouble className="size-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {t("booking.steps.review.rooms")}
                        </p>
                        <p className="text-muted-foreground">
                          {t("bookings.detail.roomCount", { count: 1 })}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("booking.details.subtotal")}
                    </span>
                    <span>
                      {formatPrice(
                        booking.price_subtotal_cents,
                        booking.currency,
                        locale,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("booking.details.fees")}
                    </span>
                    <span>
                      {formatPrice(
                        booking.price_fees_cents ?? 0,
                        booking.currency,
                        locale,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("booking.details.taxes")}
                    </span>
                    <span>
                      {formatPrice(
                        booking.price_taxes_cents ?? 0,
                        booking.currency,
                        locale,
                      )}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>{t("booking.details.total")}</span>
                    <span>
                      {formatPrice(
                        booking.price_total_cents,
                        booking.currency,
                        locale,
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isGuestView && cancellationPolicyInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="size-5" />
                    {t("bookings.detail.cancellationPolicy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {cancellationPolicyInfo.badge}
                    </Badge>
                    {booking.status === "cancelled" && cancellationDateLabel ? (
                      <Badge variant="destructive">
                        {t("bookings.detail.cancelledOn", {
                          date: cancellationDateLabel,
                        })}
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
                        {t("bookings.detail.cancellationReason")}
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
                  <CardTitle>{t("bookings.detail.messages")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booking.guest_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {isHostView
                          ? t("bookings.detail.guestMessage")
                          : t("bookings.detail.yourMessage")}
                      </p>
                      <p className="text-sm">{booking.guest_notes}</p>
                    </div>
                  )}
                  {booking.host_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {isHostView
                          ? t("bookings.detail.yourMessage")
                          : t("bookings.detail.hostMessage")}
                      </p>
                      <p className="text-sm">{booking.host_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isGuestView && booking.status === "completed" ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("bookings.detail.yourReview")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingReviewQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {t("bookings.detail.loadingReview")}
                    </div>
                  ) : bookingReviewQuery.data ? (
                    <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {t("bookings.detail.reviewSubmitted")}
                        </p>
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
                      {t("bookings.detail.experienceNotFound")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isHostView
                    ? t("bookings.detail.hostActions")
                    : t("bookings.detail.actions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isHostView ? (
                  <>
                    {canHostRespond ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenHostResponse("declined")}
                          className="w-full gap-2"
                        >
                          <XCircle className="size-4" />
                          {t("bookings.detail.decline")}
                        </Button>
                        <Button
                          onClick={() => handleOpenHostResponse("approved")}
                          className="w-full gap-2"
                        >
                          <CheckCircle2 className="size-4" />
                          {t("bookings.detail.approve")}
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        {booking.status === "approved" &&
                          "This booking has been approved and is now waiting for guest payment."}
                        {booking.status === "pending_payment" &&
                          "Guest payment is being processed."}
                        {booking.status === "confirmed" &&
                          "This booking is confirmed."}
                        {booking.status === "declined" &&
                          "This booking request was declined."}
                        {booking.status === "cancelled" &&
                          "This booking was cancelled."}
                        {booking.status === "completed" &&
                          "This booking has been completed."}
                        {booking.status === "refunded" &&
                          "This booking was refunded."}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        asChild
                        className="w-full gap-2"
                      >
                        <Link href="/host">
                          <LayoutDashboard className="size-4" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="w-full gap-2"
                      >
                        <Link href="/host/experiences">
                          <BriefcaseBusiness className="size-4" />
                          <span className="hidden sm:inline">Experiences</span>
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
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
                        {t("bookings.detail.payNow")}
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
                        {t("bookings.detail.checkPayment")}
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        asChild
                        className="w-full gap-2"
                      >
                        <Link href="/bookings">
                          <Home className="size-4" />
                          <span className="hidden sm:inline">
                            {t("bookings.detail.bookings")}
                          </span>
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="w-full gap-2"
                      >
                        <Link href="/explore">
                          <MapPin className="size-4" />
                          <span className="hidden sm:inline">
                            {t("bookings.detail.explore")}
                          </span>
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
                          {t("bookings.detail.cancelBooking")}
                        </Button>
                      </>
                    )}

                    {(canPay || booking.status === "pending_payment") && (
                      <>
                        <Separator className="my-3" />
                        <PayzoneBadge className="border-dashed" />
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <FooterSection />

      {isGuestView && cancellationPolicyInfo ? (
        <BookingCancellationDialog
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          onConfirm={handleCancelBooking}
          isLoading={cancelBookingMutation.isPending}
          policySummary={cancellationPolicyInfo.policySummary}
          refundSummary={cancellationPolicyInfo.refundSummary}
        />
      ) : null}

      <AlertDialog
        open={isHostResponseDialogOpen}
        onOpenChange={setIsHostResponseDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hostResponseMode === "approved"
                ? t("bookings.detail.approve")
                : t("bookings.detail.decline")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hostResponseMode === "approved"
                ? t("bookings.detail.approveDesc")
                : t("bookings.detail.declineDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("booking.messages.quickReplies")}
              </p>
              <div className="flex flex-wrap gap-2">
                {hostResponseTemplates.map((template) => {
                  const isActive = selectedHostTemplate === template;
                  return (
                    <button
                      key={template}
                      type="button"
                      onClick={() =>
                        setSelectedHostTemplate(isActive ? null : template)
                      }
                      className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {template}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("booking.messages.addNote")}
              </p>
              <Textarea
                value={hostResponseNote}
                onChange={(event) => setHostResponseNote(event.target.value)}
                placeholder={
                  hostResponseMode === "approved"
                    ? "Let the guest know what happens next"
                    : "Explain why you cannot host this time"
                }
                rows={4}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={hostRespondMutation.isPending}>
              {t("bookings.detail.cancel")}
            </AlertDialogCancel>
            <Button
              onClick={() => {
                void handleConfirmHostResponse();
              }}
              disabled={hostRespondMutation.isPending}
            >
              {hostRespondMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("bookings.detail.updating")}
                </>
              ) : (
                t("bookings.detail.sendResponse")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
