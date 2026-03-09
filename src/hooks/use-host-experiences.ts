"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { HostExperience } from "@/types/host-experiences";
import type { Database } from "@/types/supabase";
import { resolveStorageUrl } from "@/utils/functions";

type ExperienceRow = Database["public"]["Tables"]["experiences"]["Row"];
type ExperienceStatus = Database["public"]["Enums"]["experience_status"];

const ACTIVE_BOOKING_STATUSES: Database["public"]["Enums"]["booking_status"][] =
  ["pending_host", "approved", "pending_payment", "confirmed"];

const normalizeStatus = (status: ExperienceRow["status"]): ExperienceStatus =>
  status ?? "draft";

const toHostExperience = (
  row: ExperienceRow,
  activeBookingsCount: number,
): HostExperience => ({
  id: row.id,
  title: row.title,
  type: row.type,
  status: normalizeStatus(row.status),
  thumbnailUrl: resolveStorageUrl(row.thumbnail_url, "experiences"),
  city: row.city,
  avgRating: row.avg_rating,
  reviewsCount: row.reviews_count ?? 0,
  bookingsCount: row.bookings_count ?? 0,
  activeBookingsCount,
  createdAt: row.created_at,
});

async function fetchHostId(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hosts")
    .select("id")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

async function fetchHostExperiences(userId: string) {
  const supabase = createClient();
  const hostId = await fetchHostId(userId);

  if (!hostId) {
    return [] as HostExperience[];
  }

  const { data: experiences, error: experiencesError } = await supabase
    .from("experiences")
    .select(
      "id, title, type, status, thumbnail_url, city, avg_rating, reviews_count, bookings_count, created_at",
    )
    .eq("host_id", hostId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (experiencesError) {
    throw experiencesError;
  }

  const { data: activeBookings, error: activeBookingsError } = await supabase
    .from("bookings")
    .select("experience_id")
    .eq("host_id", hostId)
    .in("status", ACTIVE_BOOKING_STATUSES)
    .is("deleted_at", null);

  if (activeBookingsError) {
    throw activeBookingsError;
  }

  const activeByExperience = new Map<string, number>();
  (activeBookings ?? []).forEach((booking) => {
    const nextCount = (activeByExperience.get(booking.experience_id) ?? 0) + 1;
    activeByExperience.set(booking.experience_id, nextCount);
  });

  return (experiences ?? []).map((experience) =>
    toHostExperience(
      experience as ExperienceRow,
      activeByExperience.get(experience.id) ?? 0,
    ),
  );
}

async function updateExperienceVisibility({
  experienceId,
  status,
}: {
  experienceId: string;
  status: ExperienceStatus;
}) {
  const supabase = createClient();
  const updatePayload: Database["public"]["Tables"]["experiences"]["Update"] = {
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("experiences")
    .update(updatePayload)
    .eq("id", experienceId);

  if (error) {
    throw error;
  }
}

export function useHostExperiences() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["host-experiences", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        throw new Error("User is required");
      }
      return fetchHostExperiences(userId);
    },
  });
}

export function useToggleExperienceVisibility() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: updateExperienceVisibility,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["host-experiences", userId],
      });
    },
  });
}

export function useHostExperienceCounts(experiences: HostExperience[]) {
  return useMemo(
    () => ({
      all: experiences.length,
      published: experiences.filter(
        (experience) => experience.status === "published",
      ).length,
      draft: experiences.filter((experience) => experience.status === "draft")
        .length,
      review: experiences.filter((experience) => experience.status === "review")
        .length,
    }),
    [experiences],
  );
}
