"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useExperienceReviewSummary,
  useExperienceReviews,
} from "@/hooks/use-reviews";
import type { ExperienceReview, ReviewSort } from "@/types/review";
import { Button } from "../ui/button";
import { ReviewCard } from "./ReviewCard";
import { ReviewSummary } from "./ReviewSummary";

type ReviewListProps = {
  experienceId: string;
};

export function ReviewList({ experienceId }: ReviewListProps) {
  const { t } = useSiteI18n();
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [page, setPage] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState<ExperienceReview[]>([]);

  const summaryQuery = useExperienceReviewSummary(experienceId);
  const reviewsQuery = useExperienceReviews(experienceId, sort, page);

  useEffect(() => {
    if (!reviewsQuery.data) {
      return;
    }

    if (page === 0) {
      setVisibleReviews(reviewsQuery.data.items);
      return;
    }

    setVisibleReviews((current) => [
      ...current,
      ...reviewsQuery.data.items.filter(
        (incoming) => !current.some((existing) => existing.id === incoming.id),
      ),
    ]);
  }, [page, reviewsQuery.data]);

  const hasMore = reviewsQuery.data?.hasMore ?? false;
  const total = reviewsQuery.data?.total ?? 0;

  const title = useMemo(() => {
    if (!total) {
      return t("experience.reviewList.title");
    }
    return t("experience.reviewList.reviewCount", { count: total });
  }, [total, t]);

  const sortOptions: Array<{ value: ReviewSort; label: string }> = useMemo(
    () => [
      { value: "recent", label: t("experience.reviewList.sortRecent") },
      { value: "highest", label: t("experience.reviewList.sortBest") },
      { value: "lowest", label: t("experience.reviewList.sortWorst") },
    ],
    [t],
  );

  const handleSortChange = (value: string) => {
    setSort(value as ReviewSort);
    setPage(0);
  };

  if (summaryQuery.isLoading || (page === 0 && reviewsQuery.isLoading)) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaryQuery.isError || reviewsQuery.isError) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("experience.reviewList.error")}
      </div>
    );
  }

  if (!summaryQuery.data?.totalReviews) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("experience.reviewList.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReviewSummary summary={summaryQuery.data} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue
              placeholder={t("experience.reviewList.sortPlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={reviewsQuery.isFetching}
          >
            {reviewsQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {t("experience.reviewList.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
