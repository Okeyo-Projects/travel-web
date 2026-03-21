"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  HostBookingStatus,
  RecentBookingItem,
} from "@/types/host-analytics";

const STATUS_LABELS: Record<HostBookingStatus, string> = {
  draft: "Draft",
  pending_host: "Pending host",
  approved: "Approved",
  declined: "Declined",
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  refunded: "Refunded",
};

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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type RecentBookingsListProps = {
  bookings: RecentBookingItem[];
};

export function RecentBookingsList({ bookings }: RecentBookingsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
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
                  {booking.status ? STATUS_LABELS[booking.status] : "Unknown"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Guest: {booking.guestName}
              </p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {new Date(booking.fromDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" - "}
                {new Date(booking.toDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <p className="text-sm font-semibold">
                {formatMoney(booking.totalCents, booking.currency)}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/bookings/${booking.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View booking
                </Link>
                {booking.experienceId ? (
                  <Link
                    href={`/experience/${booking.experienceId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Manage experience
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
