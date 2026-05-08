"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";
import { getIntlLocale } from "@/lib/i18n";
import type {
  HostBookingStatus,
  RecentBookingItem,
} from "@/types/host-analytics";

function statusVariant(
  status: HostBookingStatus | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "cancelled" || status === "declined") {
    return "destructive";
  }
  if (status === "completed" || status === "confirmed") {
    return "default";
  }
  if (status === "pending_host" || status === "pending_payment") {
    return "secondary";
  }
  return "outline";
}

function formatMoney(cents: number, currency: string, locale: AppLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type RecentBookingsListProps = {
  bookings: RecentBookingItem[];
};

export function RecentBookingsList({ bookings }: RecentBookingsListProps) {
  const { t, locale } = useSiteI18n();
  const intlLocale = getIntlLocale(locale);

  const STATUS_LABELS: Record<HostBookingStatus, string> = {
    draft: t("host.recentBookings.statuses.draft"),
    pending_host: t("host.recentBookings.statuses.pending_host"),
    approved: t("host.recentBookings.statuses.approved"),
    declined: t("host.recentBookings.statuses.declined"),
    pending_payment: t("host.recentBookings.statuses.pending_payment"),
    confirmed: t("host.recentBookings.statuses.confirmed"),
    cancelled: t("host.recentBookings.statuses.cancelled"),
    completed: t("host.recentBookings.statuses.completed"),
    refunded: t("host.recentBookings.statuses.refunded"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("host.recentBookings.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-none">
                  {booking.experienceTitle}
                </p>
                <Badge variant={statusVariant(booking.status)}>
                  {booking.status
                    ? STATUS_LABELS[booking.status]
                    : t("host.recentBookings.statuses.unknown")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("host.recentBookings.guest")}: {booking.guestName}
              </p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {new Date(booking.fromDate).toLocaleDateString(intlLocale, {
                  month: "short",
                  day: "numeric",
                })}
                {" - "}
                {new Date(booking.toDate).toLocaleDateString(intlLocale, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <p className="text-sm font-semibold">
                {formatMoney(booking.totalCents, booking.currency, locale)}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/bookings/${booking.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {t("host.recentBookings.viewBooking")}
                </Link>
                {booking.experienceId ? (
                  <Link
                    href={`/experience/${booking.experienceId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {t("host.recentBookings.manageExperience")}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
