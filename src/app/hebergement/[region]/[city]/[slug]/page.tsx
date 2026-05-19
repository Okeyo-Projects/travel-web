import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { ExperienceDetailTracker } from "@/components/experience/ExperienceDetailTracker";
import { ExperienceDetailView } from "@/components/experience/ExperienceDetailView";
import { SimilarExperiences } from "@/components/experience/SimilarExperiences";
import { FooterSection } from "@/components/home/FooterSection";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import {
  localizeExperiencePath,
  localizeHref,
} from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";

export const revalidate = 3600;

export default async function HebergementPage({
  params,
}: {
  params: Promise<{ region: string; city: string; slug: string }>;
}) {
  const { region, city, slug } = await params;

  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  const initialData = await fetchExperienceData(slug, locale);

  if (!initialData?.transformed) {
    notFound();
  }

  const experience = initialData.transformed;

  const canonicalPath = buildExperienceHref({
    title: experience.title,
    id: experience.id,
    slug: experience.slug,
    region: experience.region,
    city: experience.city,
  });

  const requestedPath = `/hebergement/${region}/${city}/${slug}`;

  if (requestedPath !== canonicalPath) {
    permanentRedirect(
      localizeHref(localizeExperiencePath(canonicalPath, locale), locale),
    );
  }

  const url = localizeHref(
    localizeExperiencePath(canonicalPath, locale),
    locale,
  );

  return (
    <>
      <ExperienceDetailTracker
        experienceId={experience.id}
        experienceSlug={experience.slug}
      />
      <ExperienceDetailView
        experience={experience}
        url={url}
        t={t}
        locale={locale as "en" | "fr" | "ar"}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimilarExperiences
          experienceId={experience.id}
          city={experience.city}
          region={experience.region}
          limit={6}
          t={t}
        />
      </div>
      <FooterSection />
    </>
  );
}
