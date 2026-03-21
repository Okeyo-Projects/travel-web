"use client";

import { AlertCircle, BarChart3 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { RecentBookingsList } from "@/components/host/recent-bookings-list";
import { StatisticsCards } from "@/components/host/statistics-cards";

const BookingsChart = dynamic(
  () => import("@/components/host/bookings-chart").then((m) => m.BookingsChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);
const StatusBreakdownChart = dynamic(
  () => import("@/components/host/status-breakdown-chart").then((m) => m.StatusBreakdownChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> },
);
const ExperienceBreakdownChart = dynamic(
  () => import("@/components/host/experience-breakdown-chart").then((m) => m.ExperienceBreakdownChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full rounded-xl" /> },
);
import { TimePeriodSelector } from "@/components/host/time-period-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHostStats } from "@/hooks/use-host-stats";
import type { HostDashboardPeriod } from "@/types/host-analytics";

export default function HostDashboardPage() {
  const [period, setPeriod] = useState<HostDashboardPeriod>("6m");
  const { dashboard, isPending, error } = useHostStats(period);

  const emptyMessage = useMemo(() => {
    if (!dashboard?.isHost) {
      return "Switch your account to host mode to access analytics.";
    }
    return "No bookings yet. Your analytics will appear after your first reservation.";
  }, [dashboard?.isHost]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Host Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Business Analytics
          </h1>
        </div>
        <TimePeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error ? (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-800"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((skeletonId) => (
              <Skeleton key={skeletonId} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[340px] w-full rounded-xl" />
            <Skeleton className="h-[340px] w-full rounded-xl" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
      ) : dashboard?.isHost && dashboard.hasAnyBookings ? (
        <div className="space-y-4">
          <StatisticsCards summary={dashboard.summary} />
          <div className="grid gap-4 lg:grid-cols-2">
            <BookingsChart data={dashboard.bookingTrend} />
            <StatusBreakdownChart data={dashboard.statusBreakdown} />
          </div>
          <ExperienceBreakdownChart data={dashboard.experienceBreakdown} />
          <RecentBookingsList bookings={dashboard.recentBookings} />
        </div>
      ) : (
        <Card className="p-10 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-900">
            No analytics yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/explore">Explore marketplace</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/bookings">View bookings</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
