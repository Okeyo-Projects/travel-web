"use client";

import { ExperienceCard } from "./ExperienceCard";

interface RoomInfo {
  name: string;
  type?: string;
  price_mad: number;
  capacity_beds?: number;
  max_persons?: number;
}

interface ExperienceGridItem {
  id: string;
  title: string;
  description?: string;
  type: "lodging" | "trip" | "activity";
  city: string;
  region?: string;
  price_mad: number;
  currency?: string;
  rating?: number;
  reviews_count?: number;
  distance_km?: number;
  has_promo?: boolean;
  promo_badge?: string;
  thumbnail_url?: string;
  video_url?: string;
  host_name?: string;
  rooms?: RoomInfo[];
}

interface ExperienceCardsGridProps {
  experiences: ExperienceGridItem[];
  onSelectExperience?: (experienceId: string) => void;
  onBookExperience?: (experienceId: string) => void;
}

export function ExperienceCardsGrid({
  experiences,
  onSelectExperience,
  onBookExperience,
}: ExperienceCardsGridProps) {
  if (!experiences || experiences.length === 0) {
    return null;
  }

  const promoCount = experiences.filter((exp) => exp.has_promo).length;
  const isSingle = experiences.length === 1;

  return (
    <div className="space-y-4">
      {!isSingle && (
        <div className="text-sm text-muted-foreground">
          {experiences.length} résultat{experiences.length > 1 ? "s" : ""}
          {promoCount > 0 && (
            <span className="ml-2 text-orange-500 font-medium">
              ({promoCount} en promo)
            </span>
          )}
        </div>
      )}

      <div
        className={
          isSingle ? "max-w-md" : "grid grid-cols-1 md:grid-cols-2 gap-4"
        }
      >
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            onSelect={
              onSelectExperience
                ? () => onSelectExperience(experience.id)
                : undefined
            }
            onBook={
              onBookExperience
                ? () => onBookExperience(experience.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
