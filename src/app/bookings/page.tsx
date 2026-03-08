"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { getImageUrl } from "@/utils/functions";

type BookingStatus =
  | "draft"
  | "pending_host"
  | "approved"
  | "declined"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "refunded";

interface Booking {
  id: string;
  from_date: string;
  to_date: string;
  adults: number;
  children: number | null;
  infants?: number | null;
  price_total_cents: number;
  currency: string;
  status: BookingStatus | null;
  created_at: string;
  experience: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    city: string | null;
    type: string;
  } | null;
}

type ViewMode = "list" | "calendar";

type LegendItem = {
  label: string;
  className: string;
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending_host", label: "Pending" },
  { id: "confirmed", label: "Upcoming" },
  { id: "completed", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CALENDAR_LEGEND: LegendItem[] = [
  { label: "Pending host", className: "bg-amber-500" },
  { label: "Approved / awaiting payment", className: "bg-blue-500" },
  { label: "Confirmed", className: "bg-emerald-500" },
  { label: "Completed", className: "bg-slate-500" },
  { label: "Cancelled / declined", className: "bg-red-500" },
];

type TabId = (typeof STATUS_TABS)[number]["id"];

function statusBadge(status: BookingStatus | null) {
  switch (status) {
    case "pending_host":
      return {
        label: "Pending review",
        variant: "secondary" as const,
        icon: Clock,
      };
    case "approved":
      return {
        label: "Approved",
        variant: "secondary" as const,
        icon: CheckCircle,
      };
    case "pending_payment":
      return {
        label: "Awaiting payment",
        variant: "secondary" as const,
        icon: Clock,
      };
    case "confirmed":
      return {
        label: "Confirmed",
        variant: "default" as const,
        icon: CheckCircle,
      };
    case "completed":
      return {
        label: "Completed",
        variant: "outline" as const,
        icon: CheckCircle,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "declined":
      return {
        label: "Declined",
        variant: "destructive" as const,
        icon: XCircle,
      };
    case "refunded":
      return {
        label: "Refunded",
        variant: "outline" as const,
        icon: RotateCcw,
      };
    default:
      return {
        label: status ?? "Unknown",
        variant: "outline" as const,
        icon: Clock,
      };
  }
}

function getDotColorClass(status: BookingStatus | null) {
  switch (status) {
    case "pending_host":
      return "bg-amber-500";
    case "approved":
    case "pending_payment":
      return "bg-blue-500";
    case "confirmed":
      return "bg-emerald-500";
    case "completed":
    case "refunded":
      return "bg-slate-500";
    case "cancelled":
    case "declined":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

function normalizeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function eachDayInRange(from: string, to: string) {
  const start = normalizeDate(from);
  const end = normalizeDate(to);
  const days: Date[] = [];

  for (
    let current = new Date(start);
    current.getTime() <= end.getTime();
    current = addDays(current, 1)
  ) {
    days.push(new Date(current));
  }

  return days;
}

function dayIndicator(booking: Booking, selectedDay: Date) {
  const start = normalizeDate(booking.from_date);
  const end = normalizeDate(booking.to_date);
  const current = normalizeDate(selectedDay);

  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayNumber =
    Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const isStart = current.getTime() === start.getTime();
  const isEnd = current.getTime() === end.getTime();

  if (isStart && isEnd) return "Check-in & check-out";
  if (isStart) return "Check-in";
  if (isEnd) return "Check-out";

  return `Day ${dayNumber} of ${totalDays}`;
}

function formatDateRange(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const nights = Math.round(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${fromDate.toLocaleDateString("en-GB", opts)} – ${toDate.toLocaleDateString("en-GB", opts)} · ${nights} night${nights !== 1 ? "s" : ""}`;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMonthTitle(month: Date) {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return normalizeDate(a).getTime() === normalizeDate(b).getTime();
}

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedMonth, setSelectedMonth] = useState(() => normalizeDate(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => normalizeDate(new Date()));

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, from_date, to_date, adults, children, infants, price_total_cents, currency, status, created_at,
           experience:experiences(id, title, thumbnail_url, city, type)`,
        )
        .eq("guest_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  const allBookings = bookings ?? [];

  const filtered =
    activeTab === "all"
      ? allBookings
      : activeTab === "pending_host"
        ? allBookings.filter((b) =>
            ["pending_host", "approved", "pending_payment"].includes(
              b.status ?? "",
            ),
          )
        : activeTab === "completed"
          ? allBookings.filter((b) =>
              ["completed", "refunded"].includes(b.status ?? ""),
            )
          : activeTab === "cancelled"
            ? allBookings.filter((b) =>
                ["cancelled", "declined"].includes(b.status ?? ""),
              )
            : allBookings.filter((b) => b.status === activeTab);

  const monthGrid = useMemo(() => {
    const monthStart = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0,
    );

    const firstWeekday = monthStart.getDay();
    const totalDays = monthEnd.getDate();

    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [selectedMonth]);

  const dotsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();

    allBookings.forEach((booking) => {
      eachDayInRange(booking.from_date, booking.to_date).forEach((day) => {
        const key = dateKey(day);
        const existing = map.get(key) ?? [];
        existing.push(booking);
        map.set(key, existing);
      });
    });

    return map;
  }, [allBookings]);

  const selectedDayBookings = useMemo(() => {
    const key = dateKey(selectedDay);
    return (dotsByDate.get(key) ?? []).slice().sort((a, b) => {
      return new Date(a.from_date).getTime() - new Date(b.from_date).getTime();
    });
  }, [dotsByDate, selectedDay]);

  const monthHasBookings = useMemo(() => {
    return monthGrid.some((cell) => cell && (dotsByDate.get(dateKey(cell))?.length ?? 0) > 0);
  }, [monthGrid, dotsByDate]);

  const moveMonth = (direction: "prev" | "next") => {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
      const normalized = normalizeDate(next);
      setSelectedDay(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
      return normalized;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <div className="inline-flex w-full rounded-lg border bg-muted p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="size-4" />
              Calendar
            </button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
                {tab.id !== "all" && bookings && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {tab.id === "pending_host"
                      ? bookings.filter((b) =>
                          ["pending_host", "approved", "pending_payment"].includes(
                            b.status ?? "",
                          ),
                        ).length
                      : tab.id === "completed"
                        ? bookings.filter((b) =>
                            ["completed", "refunded"].includes(b.status ?? ""),
                          ).length
                        : tab.id === "cancelled"
                          ? bookings.filter((b) =>
                              ["cancelled", "declined"].includes(b.status ?? ""),
                            ).length
                          : bookings.filter((b) => b.status === tab.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <CalendarDays className="size-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No bookings found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTab === "all"
                    ? "You haven't made any bookings yet."
                    : "No bookings in this category."}
                </p>
              </div>
              <Button onClick={() => router.push("/explore")}>
                Explore experiences
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((booking) => {
                const { label, variant } = statusBadge(booking.status);
                const thumbnailUrl = booking.experience?.thumbnail_url
                  ? getImageUrl(booking.experience.thumbnail_url)
                  : null;
                return (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="block overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex">
                      {thumbnailUrl ? (
                        <div className="relative w-28 shrink-0 sm:w-36">
                          <Image
                            src={thumbnailUrl}
                            alt={booking.experience?.title ?? "Experience"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex w-28 shrink-0 items-center justify-center bg-muted sm:w-36">
                          <CalendarDays className="size-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                            {booking.experience?.title ?? "Experience"}
                          </h3>
                          <Badge variant={variant} className="shrink-0 text-xs">
                            {label}
                          </Badge>
                        </div>
                        {booking.experience?.city && (
                          <p className="text-xs text-muted-foreground">
                            📍 {booking.experience.city}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(booking.from_date, booking.to_date)}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {booking.adults} adult
                            {booking.adults !== 1 ? "s" : ""}
                            {booking.children
                              ? ` · ${booking.children} child${booking.children !== 1 ? "ren" : ""}`
                              : ""}
                          </span>
                          <span className="text-sm font-bold">
                            {formatPrice(booking.price_total_cents, booking.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveMonth("prev")}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <h2 className="text-base font-semibold sm:text-lg">
                  {formatMonthTitle(selectedMonth)}
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveMonth("next")}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground sm:gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {monthGrid.map((cell, index) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-16 rounded-lg border border-transparent sm:h-20"
                      />
                    );
                  }

                  const key = dateKey(cell);
                  const dayBookings = dotsByDate.get(key) ?? [];
                  const isSelected = isSameDay(cell, selectedDay);
                  const isToday = isSameDay(cell, new Date());

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDay(normalizeDate(cell))}
                      className={`flex h-16 flex-col rounded-lg border p-1 text-left transition-colors sm:h-20 sm:p-2 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium sm:text-sm ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {cell.getDate()}
                      </span>
                      <div className="mt-auto flex flex-wrap gap-1">
                        {dayBookings.slice(0, 4).map((booking) => (
                          <span
                            key={`${booking.id}-${key}`}
                            className={`size-2 rounded-full ${getDotColorClass(booking.status)}`}
                          />
                        ))}
                        {dayBookings.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayBookings.length - 4}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 sm:p-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Legend</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {CALENDAR_LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className={`size-2.5 rounded-full ${item.className}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Agenda</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDay.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {selectedDayBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="font-medium">No bookings on this date</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {monthHasBookings
                      ? "Pick another day to view booking details."
                      : "This month has no bookings yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map((booking) => {
                    const thumbnailUrl = booking.experience?.thumbnail_url
                      ? getImageUrl(booking.experience.thumbnail_url)
                      : null;
                    const { label, variant } = statusBadge(booking.status);
                    const guests =
                      booking.adults +
                      (booking.children ?? 0) +
                      (booking.infants ?? 0);

                    return (
                      <Link
                        key={`${booking.id}-${dateKey(selectedDay)}`}
                        href={`/bookings/${booking.id}`}
                        className="block overflow-hidden rounded-xl border transition-colors hover:bg-muted/40"
                      >
                        <div className="flex gap-3 p-3 sm:p-4">
                          {thumbnailUrl ? (
                            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-32">
                              <Image
                                src={thumbnailUrl}
                                alt={booking.experience?.title ?? "Experience"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-24 sm:w-32">
                              <CalendarDays className="size-6 text-muted-foreground/40" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="line-clamp-2 text-sm font-semibold sm:text-base">
                                {booking.experience?.title ?? "Experience"}
                              </h4>
                              <Badge variant={variant} className="text-xs">
                                {label}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground sm:text-sm">
                              {formatDateRange(booking.from_date, booking.to_date)}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                                {dayIndicator(booking, selectedDay)}
                              </span>
                              <span className="text-muted-foreground">
                                {guests} guest{guests !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
