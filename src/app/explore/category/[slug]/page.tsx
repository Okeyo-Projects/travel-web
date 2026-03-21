import { ChevronLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { ExperienceCard } from "@/components/experience-card";
import { CategoryAnalytics } from "@/components/explore/CategoryAnalytics";
import { Button } from "@/components/ui/button";
import { transformExperience } from "@/hooks/use-experiences-by-category";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import {
  categoryMatchesSlug,
  resolveLocalizedTitle,
} from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800; // ISR: revalidate every 30 minutes

type CategoryRecord = {
  id: string;
  title:
    | string
    | {
        fr?: string | null;
        en?: string | null;
        ar?: string | null;
      };
  description: string | null;
  slug?: string | null;
};

const EXPERIENCE_SELECT = `
  id,
  title,
  short_description,
  city,
  region,
  type,
  thumbnail_url,
  avg_rating,
  reviews_count,
  video:media_assets!fk_experiences_video(path, hls_playlist_url, bucket),
  host:hosts!experiences_host_id_fkey(id, name, avatar_url, verified),
  trip:experiences_trip!experiences_trip_experience_id_fkey(price_cents, currency, duration_days, duration_hours),
  lodging:experiences_lodging!experiences_lodging_experience_id_fkey(min_stay_nights),
  rooms:lodging_room_types(id, name, price_cents, currency, max_persons, total_rooms, photos)
`;

export default async function ExploreCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const routeSlug = decodeURIComponent(slug);

  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const backToExploreHref = localizeHref("/explore", locale);

  let category: CategoryRecord | null = null;
  let experiences: ReturnType<typeof transformExperience>[] = [];

  try {
    const supabase = await createClient();

    const { data: allCategories } = await supabase
      .from("categories" as never)
      .select("id, title, description, slug")
      .eq("is_active" as never, true);

    category =
      ((allCategories as CategoryRecord[] | null) ?? []).find((candidate) =>
        categoryMatchesSlug(candidate, routeSlug),
      ) ?? null;

    if (category) {
      const { data: rows } = await supabase
        .from("experience_categories" as never)
        .select(`experience:experiences!inner(${EXPERIENCE_SELECT})`)
        .eq("category_id" as never, category.id)
        .eq("experience.status" as never, "published")
        .is("experience.deleted_at" as never, null);

      experiences = (rows ?? []).map((row) =>
        transformExperience(
          (row as { experience: Parameters<typeof transformExperience>[0] })
            .experience,
        ),
      );
    }
  } catch {
    // Supabase unavailable — render empty state
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Button asChild variant="ghost" className="px-2">
            <Link href={backToExploreHref}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("explore.category.back")}
            </Link>
          </Button>
          <div className="text-center py-24 space-y-4">
            <h1 className="text-2xl font-bold">
              {t("explore.category.notFoundTitle")}
            </h1>
            <Button asChild>
              <Link href={backToExploreHref}>
                {t("explore.category.notFoundCta")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CategoryAnalytics categoryId={category.id} categorySlug={routeSlug} />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="px-2">
            <Link href={backToExploreHref}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("explore.category.back")}
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {resolveLocalizedTitle(category.title, locale)}
          </h1>
          {category.description ? (
            <p className="text-muted-foreground max-w-2xl">
              {category.description}
            </p>
          ) : null}
        </div>

        {experiences.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            {t("explore.category.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {experiences.map((experience) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                source="category"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
