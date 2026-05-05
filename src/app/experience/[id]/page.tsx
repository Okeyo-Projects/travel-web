import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import {
  localizeExperiencePath,
  localizeHref,
} from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";

export const revalidate = 3600;

export default async function ExperienceLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  const data = await fetchExperienceData(id, locale);

  if (!data?.transformed) {
    notFound();
  }

  const experience = data.transformed;
  const newPath = buildExperienceHref({
    title: experience.title,
    id: experience.id,
    slug: data.raw?.slug,
    region: experience.region,
    city: experience.city,
  });

  permanentRedirect(
    localizeHref(localizeExperiencePath(newPath, locale), locale),
  );
}
