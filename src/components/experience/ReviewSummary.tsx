import { useSiteI18n } from "@/components/site/site-i18n";
import { Progress } from "@/components/ui/progress";
import type { ExperienceReviewSummary } from "@/types/review";
import { ReviewStars } from "./ReviewStars";

type ReviewSummaryProps = {
  summary: ExperienceReviewSummary;
};

function formatRating(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value.toFixed(1);
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const { t } = useSiteI18n();

  if (!summary.totalReviews) {
    return null;
  }

  const categories = [
    {
      label: t("experience.reviewSummary.accuracy"),
      value: summary.categories.accuracy,
    },
    {
      label: t("experience.reviewSummary.cleanliness"),
      value: summary.categories.cleanliness,
    },
    {
      label: t("experience.reviewSummary.communication"),
      value: summary.categories.communication,
    },
    {
      label: t("experience.reviewSummary.location"),
      value: summary.categories.location,
    },
    {
      label: t("experience.reviewSummary.value"),
      value: summary.categories.value,
    },
  ].filter((item) => item.value !== null);

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-4xl font-semibold tracking-tight">
            {summary.averageRating.toFixed(1)}
          </p>
          <ReviewStars
            rating={summary.averageRating}
            className="flex items-center gap-1"
          />
          <p className="text-sm text-muted-foreground">
            {t("experience.reviewList.reviewCount", {
              count: summary.totalReviews,
            })}
          </p>
        </div>

        <div className="space-y-2">
          {summary.breakdown.map((item) => (
            <div key={item.stars} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-muted-foreground">{item.stars}</span>
              <Progress value={item.percentage} className="h-2 flex-1" />
              <span className="w-10 text-right text-muted-foreground">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {categories.length ? (
        <div className="grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <div
              key={category.label}
              className="rounded-xl border bg-background p-3"
            >
              <p className="text-xs text-muted-foreground">{category.label}</p>
              <p className="mt-1 text-lg font-semibold">
                {formatRating(category.value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
