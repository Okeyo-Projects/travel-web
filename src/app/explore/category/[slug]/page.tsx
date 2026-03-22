import { ChevronLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { CategoryAnalytics } from "@/components/explore/CategoryAnalytics";
import { FooterSection } from "@/components/home/FooterSection";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { transformExperience } from "@/hooks/use-experiences-by-category";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import {
  categoryMatchesSlug,
  resolveLocalizedTitle,
} from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";
import { CategoryExperienceGrid } from "./CategoryExperienceGrid";

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
      .select("*")
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

  const categoryTitle = category
    ? resolveLocalizedTitle(category.title, locale)
    : null;

  if (!category) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#121419] via-[#191a1f] to-[#670833] text-white">
          <div className="mx-auto flex min-h-[280px] w-full max-w-[1280px] flex-col px-5 pt-5 sm:px-8 sm:pt-8">
            <MarketingHeader />
            <div className="flex flex-1 flex-col justify-center py-12">
              <Button
                asChild
                variant="ghost"
                className="mb-6 w-fit px-2 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={backToExploreHref}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("explore.category.back")}
                </Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("explore.category.notFoundTitle")}
              </h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="text-center py-24 space-y-4">
            <Button asChild>
              <Link href={backToExploreHref}>
                {t("explore.category.notFoundCta")}
              </Link>
            </Button>
          </div>
        </div>

        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CategoryAnalytics categoryId={category.id} categorySlug={routeSlug} />
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121419] via-[#191a1f] to-[#670833] text-white">
        <div className="mx-auto flex min-h-[320px] w-full max-w-[1280px] flex-col px-5 pt-5 sm:px-8 sm:pt-8">
          <MarketingHeader />
          <div className="flex flex-1 flex-col justify-center py-12">
            <Button
              asChild
              variant="ghost"
              className="mb-6 w-fit px-2 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={backToExploreHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("explore.category.back")}
              </Link>
            </Button>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {categoryTitle}
              </h1>
              {category.description ? (
                <p className="max-w-2xl text-sm text-white/75 sm:text-base">
                  {category.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {experiences.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            {t("explore.category.empty")}
          </div>
        ) : (
          <CategoryExperienceGrid experiences={experiences} />
        )}
      </div>

      <FooterSection />
    </div>
  );
}
