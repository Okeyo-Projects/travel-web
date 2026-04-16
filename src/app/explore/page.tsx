import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ExplorePageClient } from "@/app/explore/ExplorePageClient";
import {
  fetchExploreCategoryGroups,
  fetchExploreSearchResults,
} from "@/lib/explore/server";
import { resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildCategorySlug } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";
import type { ExperienceType } from "@/types/experience";

export const revalidate = 1800;

function normalizeSearchValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function normalizePositiveInt(
  value: string | string[] | undefined,
  fallback: number,
): number {
  const parsed = Number(normalizeSearchValue(value));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const categoryQuery = normalizeSearchValue(params.category).trim();
  const q = normalizeSearchValue(params.q).trim();
  const typeParam = normalizeSearchValue(params.type).trim();
  const type =
    typeParam === "lodging" || typeParam === "trip" || typeParam === "activity"
      ? (typeParam as ExperienceType)
      : undefined;
  const dateFrom = normalizeSearchValue(params.dateFrom).trim() || undefined;
  const dateTo = normalizeSearchValue(params.dateTo).trim() || undefined;
  const guests = normalizePositiveInt(params.guests, 1);
  const page = normalizePositiveInt(params.page, 1);
  const pageSize = 12;
  const showSearchResults =
    q.length > 0 || Boolean(type) || Boolean(dateFrom) || guests > 1;

  if (categoryQuery) {
    try {
      const supabase = await createClient();
      const { data: category } = await supabase
        .from("categories" as never)
        .select("title, slug")
        .eq("id" as never, categoryQuery)
        .eq("is_active" as never, true)
        .maybeSingle<{
          title:
            | string
            | {
                fr?: string | null;
                en?: string | null;
                ar?: string | null;
              };
          slug?: string | null;
        }>();

      if (category) {
        redirect(
          localizeHref(
            `/explore/region/${buildCategorySlug({
              title: category.title,
              slug: category.slug,
            })}`,
            locale,
          ),
        );
      }
    } catch {
      // Ignore category redirect failures and continue rendering explore.
    }
  }

  if (showSearchResults) {
    const { items, fetchedCount } = await fetchExploreSearchResults({
      search: q || undefined,
      type,
      guests: guests > 1 ? guests : undefined,
      dateFrom,
      dateTo,
      limit: page * pageSize,
      offset: 0,
    });

    return (
      <ExplorePageClient
        categoryGroups={[]}
        searchResults={items}
        hasMoreSearchResults={fetchedCount === page * pageSize}
      />
    );
  }

  const categoryGroups = await fetchExploreCategoryGroups(8, locale);

  return (
    <ExplorePageClient
      categoryGroups={categoryGroups}
      searchResults={[]}
      hasMoreSearchResults={false}
    />
  );
}
