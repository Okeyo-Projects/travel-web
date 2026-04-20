import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { localizeHref } from "@/lib/routing/locale-path";
import { ExperienceDetailView } from "./ExperienceDetailView";

export const revalidate = 3600;

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  const initialData = await fetchExperienceData(id, locale);

  if (!initialData?.transformed) {
    notFound();
  }

  const url = localizeHref(`/experience/${id}`, locale);

  return (
    <ExperienceDetailView experience={initialData.transformed} url={url} />
  );
}
