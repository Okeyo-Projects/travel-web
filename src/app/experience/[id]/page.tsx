import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { buildExperienceHref } from "@/lib/routing/slugs";
import { localizeHref } from "@/lib/routing/locale-path";

export const revalidate = 3600;

export default async function ExperienceLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

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

  redirect(localizeHref(newPath, locale));
}
