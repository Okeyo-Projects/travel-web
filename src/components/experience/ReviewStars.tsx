import { Star } from "lucide-react";

type ReviewStarsProps = {
  rating: number;
  size?: number;
  className?: string;
};

export function ReviewStars({ rating, size = 16, className }: ReviewStarsProps) {
  return (
    <div className={className ?? "flex items-center gap-0.5"}>
      {Array.from({ length: 5 }).map((_, index) => {
        const threshold = index + 1;
        const isFilled = rating >= threshold;
        const isHalf = !isFilled && rating > index && rating < threshold;

        return (
          <span key={threshold} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star className="text-muted-foreground/40" size={size} />
            {(isFilled || isHalf) ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isFilled ? `${size}px` : `${size / 2}px` }}
              >
                <Star className="fill-amber-400 text-amber-400" size={size} />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
