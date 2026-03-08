"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending_host", label: "Pending" },
  { id: "confirmed", label: "Upcoming" },
  { id: "completed", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

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

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("all");

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
          `id, from_date, to_date, adults, children, price_total_cents, currency, status, created_at,
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

  const filtered =
    activeTab === "all"
      ? (bookings ?? [])
      : activeTab === "pending_host"
        ? (bookings ?? []).filter((b) =>
            ["pending_host", "approved", "pending_payment"].includes(
              b.status ?? "",
            ),
          )
        : activeTab === "completed"
          ? (bookings ?? []).filter((b) =>
              ["completed", "refunded"].includes(b.status ?? ""),
            )
          : activeTab === "cancelled"
            ? (bookings ?? []).filter((b) =>
                ["cancelled", "declined"].includes(b.status ?? ""),
              )
            : (bookings ?? []).filter((b) => b.status === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>

        {/* Tabs */}
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
                        [
                          "pending_host",
                          "approved",
                          "pending_payment",
                        ].includes(b.status ?? ""),
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

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <CalendarDays className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No bookings found</p>
              <p className="text-sm text-muted-foreground mt-1">
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
                  className="block rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
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
                      <div className="w-28 shrink-0 sm:w-36 bg-muted flex items-center justify-center">
                        <CalendarDays className="size-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 p-4 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
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
                          {formatPrice(
                            booking.price_total_cents,
                            booking.currency,
                          )}
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
  );
}
