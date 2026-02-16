"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ExperienceCard } from "@/components/experience-card";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useExperiencesByCategory } from "@/hooks/use-experiences-by-category";
import { localizeHref } from "@/lib/routing/locale-path";
import { categoryMatchesSlug } from "@/lib/routing/slugs";

export default function ExploreCategoryPage() {
  const pathname = usePathname();
  const params = useParams();
  const routeSlug =
    typeof params?.slug === "string" ? decodeURIComponent(params.slug) : "";

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isCategoryError,
  } = useCategories();

  const category = categories?.find((item) =>
    categoryMatchesSlug(item, routeSlug),
  );

  const {
    data: experiences,
    isLoading: isLoadingExperiences,
    isError: isExperiencesError,
  } = useExperiencesByCategory(category?.id ?? null);

  const backToExploreHref = localizeHref("/explore", pathname);
  const isLoading =
    isLoadingCategories || (Boolean(category) && isLoadingExperiences);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="px-2">
            <Link href={backToExploreHref}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour à l'exploration
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isCategoryError || isExperiencesError ? (
          <div className="text-center py-24 text-red-500">
            Une erreur est survenue lors du chargement de cette catégorie.
          </div>
        ) : !category ? (
          <div className="text-center py-24 space-y-4">
            <h1 className="text-2xl font-bold">Catégorie introuvable</h1>
            <Button asChild>
              <Link href={backToExploreHref}>Voir toutes les catégories</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {category.title.fr || category.title.en}
              </h1>
              {category.description ? (
                <p className="text-muted-foreground max-w-2xl">
                  {category.description}
                </p>
              ) : null}
            </div>

            {!experiences || experiences.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                Aucune expérience disponible dans cette catégorie.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {experiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
