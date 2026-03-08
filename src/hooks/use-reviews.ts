import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  CreateReviewInput,
  ExperienceReview,
  ExperienceReviewSummary,
  ReviewSort,
} from "@/types/review";

const PAGE_SIZE = 6;

type ReviewAuthorRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type ReviewRow = {
  id: string;
  booking_id: string;
  experience_id: string;
  author_id: string;
  rating_overall: number;
  rating_accuracy: number | null;
  rating_cleanliness: number | null;
  rating_communication: number | null;
  rating_location: number | null;
  rating_value: number | null;
  title: string | null;
  text: string;
  host_response: string | null;
  host_responded_at: string | null;
  created_at: string;
  author: ReviewAuthorRow | null;
};

function mapReview(row: ReviewRow): ExperienceReview {
  return {
    id: row.id,
    bookingId: row.booking_id,
    experienceId: row.experience_id,
    authorId: row.author_id,
    ratingOverall: row.rating_overall,
    ratingAccuracy: row.rating_accuracy,
    ratingCleanliness: row.rating_cleanliness,
    ratingCommunication: row.rating_communication,
    ratingLocation: row.rating_location,
    ratingValue: row.rating_value,
    title: row.title,
    text: row.text,
    hostResponse: row.host_response,
    hostRespondedAt: row.host_responded_at,
    createdAt: row.created_at,
    author: {
      id: row.author?.id ?? row.author_id,
      displayName: row.author?.display_name ?? "Voyageur",
      avatarUrl: row.author?.avatar_url ?? null,
    },
  };
}

function toOrder(sort: ReviewSort) {
  if (sort === "highest") {
    return { column: "rating_overall", ascending: false };
  }
  if (sort === "lowest") {
    return { column: "rating_overall", ascending: true };
  }
  return { column: "created_at", ascending: false };
}

function calculateSummary(rows: ReviewRow[]): ExperienceReviewSummary {
  const totalReviews = rows.length;

  if (!totalReviews) {
    return {
      totalReviews: 0,
      averageRating: 0,
      breakdown: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: 0,
        percentage: 0,
      })),
      categories: {
        accuracy: null,
        cleanliness: null,
        communication: null,
        location: null,
        value: null,
      },
    };
  }

  const averageRating =
    rows.reduce((acc, row) => acc + row.rating_overall, 0) / totalReviews;

  const countByStars = new Map<number, number>();
  for (const row of rows) {
    countByStars.set(
      row.rating_overall,
      (countByStars.get(row.rating_overall) ?? 0) + 1,
    );
  }

  const breakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = countByStars.get(stars) ?? 0;
    return {
      stars,
      count,
      percentage: Math.round((count / totalReviews) * 100),
    };
  });

  const categoryAverage = (values: Array<number | null>) => {
    const filtered = values.filter((value): value is number => value !== null);
    if (!filtered.length) {
      return null;
    }
    return filtered.reduce((acc, value) => acc + value, 0) / filtered.length;
  };

  return {
    totalReviews,
    averageRating,
    breakdown,
    categories: {
      accuracy: categoryAverage(rows.map((row) => row.rating_accuracy)),
      cleanliness: categoryAverage(rows.map((row) => row.rating_cleanliness)),
      communication: categoryAverage(rows.map((row) => row.rating_communication)),
      location: categoryAverage(rows.map((row) => row.rating_location)),
      value: categoryAverage(rows.map((row) => row.rating_value)),
    },
  };
}

export function useExperienceReviewSummary(experienceId: string | null | undefined) {
  return useQuery({
    queryKey: ["review-summary", experienceId],
    enabled: Boolean(experienceId),
    queryFn: async () => {
      if (!experienceId) {
        throw new Error("Experience ID is required");
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "rating_overall, rating_accuracy, rating_cleanliness, rating_communication, rating_location, rating_value",
        )
        .eq("experience_id", experienceId)
        .is("deleted_at", null);

      if (error) {
        throw error;
      }

      return calculateSummary((data ?? []) as ReviewRow[]);
    },
  });
}

export function useExperienceReviews(
  experienceId: string | null | undefined,
  sort: ReviewSort,
  page: number,
) {
  return useQuery({
    queryKey: ["experience-reviews", experienceId, sort, page],
    enabled: Boolean(experienceId),
    queryFn: async () => {
      if (!experienceId) {
        throw new Error("Experience ID is required");
      }

      const supabase = createClient();
      const order = toOrder(sort);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("reviews")
        .select(
          `
            id,
            booking_id,
            experience_id,
            author_id,
            rating_overall,
            rating_accuracy,
            rating_cleanliness,
            rating_communication,
            rating_location,
            rating_value,
            title,
            text,
            host_response,
            host_responded_at,
            created_at,
            author:profiles!reviews_author_id_fkey(id, display_name, avatar_url)
          `,
          { count: "exact" },
        )
        .eq("experience_id", experienceId)
        .is("deleted_at", null)
        .order(order.column, { ascending: order.ascending })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      const total = count ?? 0;
      return {
        items: ((data ?? []) as ReviewRow[]).map(mapReview),
        total,
        hasMore: to + 1 < total,
      };
    },
  });
}

export function useReviewForBooking(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: ["booking-review", bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      if (!bookingId) {
        throw new Error("Booking ID is required");
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
            id,
            booking_id,
            experience_id,
            author_id,
            rating_overall,
            rating_accuracy,
            rating_cleanliness,
            rating_communication,
            rating_location,
            rating_value,
            title,
            text,
            host_response,
            host_responded_at,
            created_at,
            author:profiles!reviews_author_id_fkey(id, display_name, avatar_url)
          `,
        )
        .eq("booking_id", bookingId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return mapReview(data as ReviewRow);
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Vous devez être connecté pour laisser un avis.");
      }

      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          booking_id: input.bookingId,
          experience_id: input.experienceId,
          author_id: user.id,
          rating_overall: input.ratingOverall,
          text: input.text,
        })
        .select("id, booking_id, experience_id")
        .single();

      if (error) {
        throw error;
      }

      await supabase
        .from("review_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("booking_id", input.bookingId)
        .in("status", ["pending", "accepted"]);

      return review;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["booking-review", result.booking_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["review-summary", result.experience_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["experience-reviews", result.experience_id],
      });
      queryClient.invalidateQueries({ queryKey: ["experience-detail", result.experience_id] });
    },
  });
}
