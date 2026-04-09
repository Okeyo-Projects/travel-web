"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { ExperienceCard } from "./ExperienceCard";

interface RoomInfo {
  name: string;
  type?: string;
  price_mad: number;
  capacity_beds?: number;
  max_persons?: number;
}

export interface ExperienceGridItem {
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

export interface ExperienceCardsGridProps {
  experiences: ExperienceGridItem[];
  onSelectExperience?: (experienceId: string) => void;
  onBookExperience?: (experienceId: string) => void;
}

export function ExperienceCardsGrid({
  experiences,
  onSelectExperience,
  onBookExperience,
}: ExperienceCardsGridProps) {
  const { t } = useSiteI18n();
  if (!experiences || experiences.length === 0) {
    return null;
  }

  const promoCount = experiences.filter((exp) => exp.has_promo).length;
  const isSingle = experiences.length === 1;

  return (
    <div className="space-y-4">
      {!isSingle && (
        <div className="text-sm text-muted-foreground">
          {experiences.length === 1
            ? t("chat.results.count.one", { count: experiences.length })
            : t("chat.results.count.other", { count: experiences.length })}
          {promoCount > 0 && (
            <span className="inline-flex gap-1 text-orange-500 font-medium [padding-inline-start:0.5rem]">
              ({t("chat.results.promoCount", { count: promoCount })})
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
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
