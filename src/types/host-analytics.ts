import type { Database } from "@/types/supabase";

export type HostDashboardPeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

export type HostBookingStatus = Database["public"]["Enums"]["booking_status"];

export type HostBookingRecord = {
  id: string;
  created_at: string;
  from_date: string;
  to_date: string;
  status: HostBookingStatus | null;
  price_total_cents: number;
  currency: string;
  adults: number;
  children: number | null;
  infants: number | null;
  guest_id: string;
  experience_id: string;
  guest: {
    id: string;
    display_name: string;
  } | null;
  experience: {
    id: string;
    title: string;
  } | null;
};

export type HostDashboardSummary = {
  totalBookings: number;
  totalRevenueCents: number;
  totalGuests: number;
  averageRating: number | null;
  currency: string;
};

export type BookingTrendPoint = {
  key: string;
  label: string;
  bookings: number;
  revenue: number;
};

export type StatusBreakdownPoint = {
  status: HostBookingStatus;
  label: string;
  value: number;
};

export type ExperienceBreakdownPoint = {
  experienceId: string;
  experienceTitle: string;
  bookings: number;
  revenue: number;
};

export type RecentBookingItem = {
  id: string;
  status: HostBookingStatus | null;
  guestName: string;
  experienceId: string | null;
  experienceTitle: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  totalCents: number;
  currency: string;
};

export type HostDashboardData = {
  hostId: string;
  hostName: string;
  isHost: boolean;
  summary: HostDashboardSummary;
  bookingTrend: BookingTrendPoint[];
  statusBreakdown: StatusBreakdownPoint[];
  experienceBreakdown: ExperienceBreakdownPoint[];
  recentBookings: RecentBookingItem[];
  hasAnyBookings: boolean;
};

export const HOST_DASHBOARD_PERIOD_OPTIONS: Array<{
  value: HostDashboardPeriod;
  label: string;
}> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];
