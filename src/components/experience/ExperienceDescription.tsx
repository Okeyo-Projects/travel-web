"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExperienceDescriptionProps {
  description: string;
}

export function ExperienceDescription({ description }: ExperienceDescriptionProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const showReadMore = description.length > 280;
  const visibleDescription =
    showReadMore && !descriptionExpanded
      ? `${description.slice(0, 280)}...`
      : description;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">
        À propos de cette expérience
      </h2>
      <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {visibleDescription}
      </p>
      {showReadMore ? (
        <Button
          variant="link"
          className="h-auto p-0 font-semibold"
          onClick={() => setDescriptionExpanded((state) => !state)}
        >
          {descriptionExpanded ? "Voir moins" : "Lire plus"}
        </Button>
      ) : null}
    </div>
  );
}
