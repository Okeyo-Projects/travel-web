import { createClient } from "@/lib/supabase/server";
import { GuideSearchPageClient } from "./GuideSearchPageClient";

interface CityOption {
  slug: string;
  name: string;
}

interface GuideItemTypeOption {
  slug: string;
  label: string;
}

export default async function GuideSearchPage() {
  const supabase = await createClient();

  const [{ data: cities }, { data: guideTypes }] = await Promise.all([
    supabase
      .from("cities")
      .select("slug, name")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(200),
    supabase
      .from("guide_item_types")
      .select("slug, label_i18n")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const cityOptions: CityOption[] = (cities ?? [])
    .filter((city): city is { slug: string; name: string } =>
      Boolean(city.slug),
    )
    .map((city) => ({ slug: city.slug, name: city.name }));

  const typeOptions: GuideItemTypeOption[] = (guideTypes ?? [])
    .filter(
      (
        type,
      ): type is {
        slug: string;
        label_i18n: Record<string, string>;
      } => Boolean(type.slug) && typeof type.label_i18n === "object",
    )
    .map((type) => ({
      slug: type.slug,
      label:
        type.label_i18n.fr ??
        type.label_i18n.en ??
        type.label_i18n.ar ??
        type.slug,
    }));

  return (
    <GuideSearchPageClient cities={cityOptions} guideTypes={typeOptions} />
  );
}
