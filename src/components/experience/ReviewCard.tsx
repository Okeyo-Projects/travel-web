import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ExperienceReview } from "@/types/review";
import { ReviewStars } from "./ReviewStars";

type ReviewCardProps = {
  review: ExperienceReview;
};

const MAX_TEXT_LENGTH = 220;

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = useMemo(() => {
    return format(new Date(review.createdAt), "MMMM yyyy", { locale: fr });
  }, [review.createdAt]);

  const canExpand = review.text.length > MAX_TEXT_LENGTH;
  const visibleText =
    expanded || !canExpand
      ? review.text
      : `${review.text.slice(0, MAX_TEXT_LENGTH).trimEnd()}...`;

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={review.author.avatarUrl ?? undefined} alt={review.author.displayName} />
            <AvatarFallback>{review.author.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{review.author.displayName}</p>
            <p className="text-xs capitalize text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <ReviewStars rating={review.ratingOverall} />
      </header>

      {review.title ? <p className="font-medium">{review.title}</p> : null}

      <div className="space-y-1">
        <p className="text-sm leading-relaxed text-muted-foreground">{visibleText}</p>
        {canExpand ? (
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Voir moins" : "Lire plus"}
          </button>
        ) : null}
      </div>

      {review.hostResponse ? (
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Réponse de l'hôte
          </p>
          <p className="text-sm text-muted-foreground">{review.hostResponse}</p>
        </div>
      ) : null}
    </article>
  );
}
