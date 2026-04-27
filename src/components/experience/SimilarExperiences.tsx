import { CompactExperienceCard } from "@/components/explore/CompactExperienceCard";
import type { Translator } from "@/lib/i18n";
import { fetchSimilarExperiences } from "@/lib/explore/server";

interface SimilarExperiencesProps {
  experienceId: string;
  city: string;
  region?: string | null;
  limit?: number;
  t: Translator;
}

export async function SimilarExperiences({
  experienceId,
  city,
  region,
  limit = 6,
  t,
}: SimilarExperiencesProps) {
  const similar = await fetchSimilarExperiences({
    excludeId: experienceId,
    city,
    region,
    limit,
  });

  if (!similar.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("experienceDetails.similar.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {similar.map((exp) => (
          <CompactExperienceCard key={exp.id} experience={exp} />
        ))}
      </div>
    </section>
  );
}
