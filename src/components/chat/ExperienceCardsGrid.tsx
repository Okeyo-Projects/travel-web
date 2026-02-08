'use client';

import { ExperienceCard } from './ExperienceCard';

interface ExperienceCardsGridProps {
  experiences: any[];
  onSelectExperience?: (experienceId: string) => void;
  onBookExperience?: (experienceId: string) => void;
}

export function ExperienceCardsGrid({ 
  experiences, 
  onSelectExperience, 
  onBookExperience 
}: ExperienceCardsGridProps) {
  if (!experiences || experiences.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune expérience trouvée
      </div>
    );
  }

  const promoCount = experiences.filter(exp => exp.has_promo).length;
  const isSingle = experiences.length === 1;

  return (
    <div className="space-y-4">
      {!isSingle && (
        <div className="text-sm text-muted-foreground">
          {experiences.length} résultat{experiences.length > 1 ? 's' : ''}
          {promoCount > 0 && (
            <span className="ml-2 text-orange-500 font-medium">
              ({promoCount} en promo)
            </span>
          )}
        </div>
      )}

      <div className={isSingle ? 'max-w-md' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            onSelect={onSelectExperience ? () => onSelectExperience(experience.id) : undefined}
            onBook={onBookExperience ? () => onBookExperience(experience.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
