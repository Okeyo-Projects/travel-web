import { Loader2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateReview } from "@/hooks/use-reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSiteI18n } from "@/components/site/site-i18n";

type ReviewFormProps = {
  bookingId: string;
  experienceId: string;
  onSuccess?: () => void;
};

const MIN_REVIEW_LENGTH = 10;

export function ReviewForm({
  bookingId,
  experienceId,
  onSuccess,
}: ReviewFormProps) {
  const { t } = useSiteI18n();
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [text, setText] = useState("");
  const createReview = useCreateReview();

  const isValid = rating > 0 && text.trim().length >= MIN_REVIEW_LENGTH;
  const shownRating = hovered || rating;

  const helperText = useMemo(() => {
    if (!rating) {
      return t("review.chooseRating");
    }
    if (text.trim().length < MIN_REVIEW_LENGTH) {
      return t("review.minLength", { min: MIN_REVIEW_LENGTH });
    }
    return t("review.readyToPublish");
  }, [rating, text, t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createReview.mutateAsync({
        bookingId,
        experienceId,
        ratingOverall: rating,
        text: text.trim(),
      });

      toast.success(t("review.success"));
      setRating(0);
      setHovered(0);
      setText("");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("review.error");
      toast.error(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-card p-4"
    >
      <div>
        <p className="font-medium">{t("review.shareExperience")}</p>
        <p className="text-sm text-muted-foreground">{t("review.helpText")}</p>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          const active = shownRating >= value;

          return (
            <button
              key={value}
              type="button"
              className="rounded p-1"
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(value)}
              aria-label={`Rate ${value} out of 5`}
            >
              <Star
                className={
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/35"
                }
              />
            </button>
          );
        })}
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("review.placeholder")}
        rows={5}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{helperText}</p>
        <Button type="submit" disabled={!isValid || createReview.isPending}>
          {createReview.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {t("review.publish")}
        </Button>
      </div>
    </form>
  );
}
