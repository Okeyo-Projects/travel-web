import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { createClient } from "@/lib/supabase/server";
import { categoryMatchesSlug } from "@/lib/routing/slugs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

async function fetchCategoryTitle(routeSlug: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories" as never)
      .select("id, title, slug")
      .eq("is_active" as never, true);
    const category = (
      data as Array<{
        id: string;
        title: { fr: string; en: string; ar: string };
        slug: string | null;
      }> | null
    )?.find((c) => categoryMatchesSlug(c, routeSlug));
    if (!category) return null;
    return category.title.fr || category.title.en || null;
  } catch {
    return null;
  }
}

export default async function CategorySlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const routeSlug = decodeURIComponent(slug);
  const categoryTitle = await fetchCategoryTitle(routeSlug);
  const categoryUrl = `${SITE_URL}/explore/category/${slug}`;

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Accueil",
              item: SITE_URL,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Explorer",
              item: `${SITE_URL}/explore`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: categoryTitle ?? routeSlug,
              item: categoryUrl,
            },
          ],
        }}
      />
      {children}
    </>
  );
}
