import type { Database } from "@/types/supabase";

export type ExperienceStatus = Database["public"]["Enums"]["experience_status"];
export type ExperienceType = Database["public"]["Enums"]["experience_type"];

export type HostExperience = {
  id: string;
  title: string;
  type: ExperienceType;
  status: ExperienceStatus;
  thumbnailUrl: string | null;
  city: string | null;
  avgRating: number | null;
  reviewsCount: number;
  bookingsCount: number;
  activeBookingsCount: number;
  createdAt: string;
};

export type HostExperienceFilter = "all" | "published" | "draft" | "review";
