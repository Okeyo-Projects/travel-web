import { Loader2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateReview } from "@/hooks/use-reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReviewFormProps = {
  bookingId: string;
  experienceId: string;
  onSuccess?: () => void;
};

const MIN_REVIEW_LENGTH = 10;

export function ReviewForm({ bookingId, experienceId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [text, setText] = useState("");
  const createReview = useCreateReview();

  const isValid = rating > 0 && text.trim().length >= MIN_REVIEW_LENGTH;
  const shownRating = hovered || rating;

  const helperText = useMemo(() => {
    if (!rating) {
      return "Choisissez une note";
    }
    if (text.trim().length < MIN_REVIEW_LENGTH) {
      return `Votre avis doit contenir au moins ${MIN_REVIEW_LENGTH} caractères`;
    }
    return "Prêt à publier";
  }, [rating, text]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createReview.mutateAsync({
        bookingId,
        experienceId,
        ratingOverall: rating,
        text: text.trim(),
      });

      toast.success("Merci, votre avis a été publié.");
      setRating(0);
      setHovered(0);
      setText("");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer votre avis.";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <p className="font-medium">Partagez votre expérience</p>
        <p className="text-sm text-muted-foreground">Votre retour aide les prochains voyageurs.</p>
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
              aria-label={`Noter ${value} sur 5`}
            >
              <Star className={active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"} />
            </button>
          );
        })}
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Décrivez ce que vous avez apprécié, l'accueil, l'organisation..."
        rows={5}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{helperText}</p>
        <Button type="submit" disabled={!isValid || createReview.isPending}>
          {createReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Publier l'avis
        </Button>
      </div>
    </form>
  );
}
