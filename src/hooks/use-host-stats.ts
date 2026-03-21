"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type {
  BookingTrendPoint,
  ExperienceBreakdownPoint,
  HostBookingRecord,
  HostBookingStatus,
  HostDashboardData,
  HostDashboardPeriod,
  RecentBookingItem,
  StatusBreakdownPoint,
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

const REVENUE_STATUSES = new Set<HostBookingStatus>([
  "approved",
  "pending_payment",
  "confirmed",
  "completed",
]);

type HostBaseData = {
  hostId: string;
  hostName: string;
  avgRating: number | null;
  isHost: boolean;
  bookings: HostBookingRecord[];
};

function getPeriodStart(
  period: HostDashboardPeriod,
  now = new Date(),
): Date | null {
  const date = new Date(now);
  switch (period) {
    case "7d":
      date.setDate(date.getDate() - 7);
      return date;
    case "30d":
      date.setDate(date.getDate() - 30);
      return date;
    case "3m":
      date.setMonth(date.getMonth() - 3);
      return date;
    case "6m":
      date.setMonth(date.getMonth() - 6);
      return date;
    case "1y":
      date.setFullYear(date.getFullYear() - 1);
      return date;
    case "all":
      return null;
    default:
      return null;
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildTrendBuckets(
  period: HostDashboardPeriod,
  now = new Date(),
): BookingTrendPoint[] {
  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 7 : 30;
    return Array.from({ length: days }).map((_, i) => {
      const day = startOfDay(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (days - 1 - i),
        ),
      );
      return {
        key: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        bookings: 0,
        revenue: 0,
      };
    });
  }

  const months = period === "3m" ? 3 : 6;
  const monthCount = period === "all" || period === "1y" ? 12 : months;
  return Array.from({ length: monthCount }).map((_, i) => {
    const monthDate = new Date(
      now.getFullYear(),
      now.getMonth() - (monthCount - 1 - i),
      1,
    );
    return {
      key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      bookings: 0,
      revenue: 0,
    };
  });
}

function trendKeyForDate(period: HostDashboardPeriod, date: Date): string {
  if (period === "7d" || period === "30d") {
    return date.toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function aggregateDashboard(
  data: HostBaseData,
  period: HostDashboardPeriod,
): HostDashboardData {
  const periodStart = getPeriodStart(period);
  const bookingsInPeriod = data.bookings.filter((booking) => {
    if (!periodStart) {
      return true;
    }
    return new Date(booking.created_at) >= periodStart;
  });

  const currency =
    bookingsInPeriod[0]?.currency ?? data.bookings[0]?.currency ?? "USD";

  const summary = {
    totalBookings: bookingsInPeriod.length,
    totalRevenueCents: bookingsInPeriod
      .filter(
        (booking) => booking.status && REVENUE_STATUSES.has(booking.status),
      )
      .reduce((sum, booking) => sum + booking.price_total_cents, 0),
    totalGuests: bookingsInPeriod
      .filter(
        (booking) => booking.status && REVENUE_STATUSES.has(booking.status),
      )
      .reduce(
        (sum, booking) =>
          sum +
          booking.adults +
          (booking.children ?? 0) +
          (booking.infants ?? 0),
        0,
      ),
    averageRating: data.avgRating,
    currency,
  };

  const trendMap = new Map(
    buildTrendBuckets(period).map((point) => [point.key, point]),
  );
  for (const booking of bookingsInPeriod) {
    const createdAt = new Date(booking.created_at);
    const key = trendKeyForDate(period, createdAt);
    const bucket = trendMap.get(key);
    if (!bucket) {
      continue;
    }
    bucket.bookings += 1;
    if (booking.status && REVENUE_STATUSES.has(booking.status)) {
      bucket.revenue += booking.price_total_cents / 100;
    }
  }

  const statusCounts = new Map<HostBookingStatus, number>();
  for (const booking of bookingsInPeriod) {
    if (!booking.status) {
      continue;
    }
    statusCounts.set(
      booking.status,
      (statusCounts.get(booking.status) ?? 0) + 1,
    );
  }

  const statusBreakdown: StatusBreakdownPoint[] = Array.from(
    statusCounts.entries(),
  )
    .map(([status, value]) => ({
      status,
      value,
      label: STATUS_LABELS[status],
    }))
    .sort((a, b) => b.value - a.value);

  const byExperience = new Map<string, ExperienceBreakdownPoint>();
  for (const booking of bookingsInPeriod) {
    const experienceId = booking.experience?.id ?? booking.experience_id;
    if (!experienceId) {
      continue;
    }
    const current = byExperience.get(experienceId) ?? {
      experienceId,
      experienceTitle: booking.experience?.title ?? "Untitled experience",
      bookings: 0,
      revenue: 0,
    };
    current.bookings += 1;
    if (booking.status && REVENUE_STATUSES.has(booking.status)) {
      current.revenue += booking.price_total_cents / 100;
    }
    byExperience.set(experienceId, current);
  }

  const experienceBreakdown = Array.from(byExperience.values())
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 6);

  const recentBookings: RecentBookingItem[] = bookingsInPeriod
    .slice(0, 5)
    .map((booking) => ({
      id: booking.id,
      status: booking.status,
      guestName: booking.guest?.display_name ?? "Guest",
      experienceId: booking.experience?.id ?? null,
      experienceTitle: booking.experience?.title ?? "Untitled experience",
      fromDate: booking.from_date,
      toDate: booking.to_date,
      createdAt: booking.created_at,
      totalCents: booking.price_total_cents,
      currency: booking.currency,
    }));

  return {
    hostId: data.hostId,
    hostName: data.hostName,
    isHost: data.isHost,
    summary,
    bookingTrend: Array.from(trendMap.values()),
    statusBreakdown,
    experienceBreakdown,
    recentBookings,
    hasAnyBookings: data.bookings.length > 0,
  };
}

export function useHostStats(period: HostDashboardPeriod) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["host-dashboard", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<HostBaseData> => {
      if (!user?.id) {
        throw new Error("User is required");
      }

      const supabase = createClient();

      const [
        { data: profile, error: profileError },
        { data: host, error: hostError },
      ] = await Promise.all([
        supabase.from("profiles").select("is_host").eq("id", user.id).single(),
        supabase
          .from("hosts")
          .select("id, name, avg_rating")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .maybeSingle(),
      ]);

      if (profileError) {
        throw profileError;
      }

      if (hostError) {
        throw hostError;
      }

      const isHost = Boolean(profile?.is_host);
      if (!isHost || !host) {
        return {
          hostId: "",
          hostName: "",
          avgRating: null,
          isHost,
          bookings: [],
        };
      }

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `id, created_at, from_date, to_date, status, price_total_cents, currency, adults, children, infants, guest_id, experience_id,
           guest:profiles!bookings_guest_id_fkey(id, display_name),
           experience:experiences!bookings_experience_id_fkey(id, title)`,
        )
        .eq("host_id", host.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (bookingsError) {
        throw bookingsError;
      }

      return {
        hostId: host.id,
        hostName: host.name,
        avgRating: host.avg_rating,
        isHost,
        bookings: (bookings ?? []) as HostBookingRecord[],
      };
    },
  });

  const dashboard = useMemo(() => {
    if (!query.data) {
      return null;
    }
    return aggregateDashboard(query.data, period);
  }, [period, query.data]);

  return {
    ...query,
    dashboard,
  };
}
