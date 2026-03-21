import { headers } from "next/headers";
import { CollectionCard } from "@/components/collection-card";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildCategorySlug } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";
import { resolveStorageUrl } from "@/utils/functions";

export const revalidate = 3600; // ISR: revalidate every hour

export default async function CollectionsPage() {
  // Derive locale the same way the root layout does
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-locale");
  const locale = isSupportedLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

  // Fetch categories server-side so crawlers see content in initial HTML
  let categories: Array<{
    id: string;
    title: { fr: string; en: string; ar: string };
    description: string | null;
    asset: string | null;
    slug: string | null;
  }> = [];

  try {
    const supabase = await createClient();

    const { data: allCategories } = await supabase
      .from("categories" as never)
      .select("id, title, description, asset, slug")
      .eq("is_active" as never, true)
      .order("created_at" as never, { ascending: false });

    // Only show categories that have at least one published experience
    const { data: usedCategoryData } = await supabase
      .from("experience_categories" as never)
      .select("category_id, experience:experiences!inner(status)")
      .eq("experience.status" as never, "published");

    const usedIds = new Set(
      (usedCategoryData as Array<{ category_id: string }> | null)?.map(
        (r) => r.category_id,
      ) ?? [],
    );

    categories = (
      (allCategories as typeof categories | null) ?? []
    ).filter((c) => usedIds.has(c.id));
  } catch {
    // Supabase unavailable — render empty state rather than crashing
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Nos Collections</h1>
        <p className="text-muted-foreground max-w-2xl">
          Explorez nos sélections thématiques pour trouver l&apos;inspiration.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          Aucune collection disponible pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <CollectionCard
              key={category.id}
              title={category.title.fr || category.title.en}
              description={category.description ?? undefined}
              imageUrl={resolveStorageUrl(category.asset)}
              href={localizeHref(
                `/explore/category/${buildCategorySlug({
                  title: category.title,
                  slug: category.slug,
                })}`,
                locale,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
