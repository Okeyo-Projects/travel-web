"use client";

import { useState } from "react";
import { CompactExperienceCard } from "@/components/explore/CompactExperienceCard";
import { ExperienceDetailModal } from "@/components/explore/ExperienceDetailModal";
import type { ExperienceListItem } from "@/types/experience";

type CategoryExperienceGridProps = {
  experiences: ExperienceListItem[];
};

export function CategoryExperienceGrid({
  experiences,
}: CategoryExperienceGridProps) {
  const [activeExperienceIndex, setActiveExperienceIndex] = useState<
    number | null
  >(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {experiences.map((experience, index) => (
          <CompactExperienceCard
            key={experience.id}
            experience={experience}
            onOpenDetails={() => setActiveExperienceIndex(index)}
          />
        ))}
      </div>

      <ExperienceDetailModal
        open={activeExperienceIndex !== null}
        experiences={experiences}
        startIndex={activeExperienceIndex ?? 0}
        onClose={() => setActiveExperienceIndex(null)}
      />
    </>
  );
}
