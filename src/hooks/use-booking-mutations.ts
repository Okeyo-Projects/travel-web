import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type CreateBookingInput = {
  experienceId: string;
  hostId: string;
  guestId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  infants: number;
  departureId?: string | null;
  rooms?: { room_type_id: string; quantity: number }[];
  partyDetails?: Record<string, unknown>;
  guestNotes?: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type BookingQuoteInput = {
  experienceId: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children?: number;
  infants?: number;
  rooms?: Array<{ room_type_id: string; quantity: number }>;
  departureId?: string;
  promotionCode?: string;
  userId?: string;
};

export type BookingQuoteResult = {
  subtotal_cents: number;
  fees_cents: number;
  taxes_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  nights: number;
  breakdown: Array<{
    label: string;
    amount_cents: number;
  }>;
  success: boolean;
  message: string;
};

export type CancelBookingInput = {
  bookingId: string;
  guestId: string;
  reason?: string;
  details?: string;
};

const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending_host",
  "approved",
  "pending_payment",
];

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data, error } = await supabase.functions.invoke(
        "create-booking",
        {
          body: input,
        },
      );

      if (error) {
        throw new Error(`Failed to create booking: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ["user-bookings", data.guest_id],
        });
        // We might not need to invalidate host-bookings on the client side for the guest app,
        // but it doesn't hurt if we share cache keys.
        queryClient.invalidateQueries({
          queryKey: ["experience-availability", data.experience_id],
        });
      }
    },
  });
}

export function useGetBookingQuote() {
  const supabase = createClient();
  const supabaseAny = supabase as any;

  return useMutation({
    mutationFn: async (input: BookingQuoteInput) => {
      // Use local session for user_id to ensure we catch the current user
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabaseAny.rpc("get_booking_quote", {
        p_experience_id: input.experienceId,
        p_from_date: input.fromDate,
        p_to_date: input.toDate,
        p_adults: input.adults,
        p_children: input.children ?? 0,
        p_infants: input.infants ?? 0,
        p_rooms: input.rooms ? JSON.stringify(input.rooms) : null,
        p_departure_id: input.departureId ?? null,
        p_promotion_code: input.promotionCode ?? null,
        p_user_id: session?.user?.id ?? null,
      });

      if (error) throw error;

      // RPC returns array with one result in some contexts, or just the object
      const result = Array.isArray(data) ? data[0] : (data as any);

      if (!result || !result.success) {
        throw new Error(result?.message || "Failed to get quote");
      }

      return result as BookingQuoteResult;
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CancelBookingInput) => {
      const cancellationReason = input.reason
        ? input.details?.trim()
          ? `${input.reason} — ${input.details.trim()}`
          : input.reason
        : input.details?.trim() || null;

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: input.guestId,
          cancellation_reason: cancellationReason,
        })
        .eq("id", input.bookingId)
        .eq("guest_id", input.guestId)
        .in("status", CANCELLABLE_BOOKING_STATUSES)
        .select("id,guest_id,experience_id,status")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Impossible d'annuler cette réservation.");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["bookings", data.guest_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["booking-detail", data.id, data.guest_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["user-bookings", data.guest_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["experience-availability", data.experience_id],
      });
    },
  });
}
