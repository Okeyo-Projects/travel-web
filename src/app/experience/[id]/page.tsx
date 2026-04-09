import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { ExperienceDetailView } from "./ExperienceDetailView";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialData = await fetchExperienceData(id);

  if (!initialData?.transformed) {
    notFound();
  }

  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const url = localizeHref(`/experience/${id}`, locale);

  return (
    <ExperienceDetailView
      experience={initialData.transformed}
      url={url}
    />
  );
}
