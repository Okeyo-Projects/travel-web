import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildCategorySlug, buildExperienceSlug } from "@/lib/routing/slugs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/collections`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/chat`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/preorder`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let categoryRoutes: MetadataRoute.Sitemap = [];
  let experienceRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    // Fetch active categories that have published experiences
    const [categoriesResult, experiencesResult] = await Promise.all([
      supabase
        .from("categories" as never)
        .select("title, slug, updated_at")
        .eq("is_active" as never, true),
      supabase
        .from("experiences" as never)
        .select("id, title, updated_at")
        .eq("status" as never, "published"),
    ]);

    const categories = (categoriesResult.data ?? []) as Array<{
      title: { fr?: string; en?: string; ar?: string } | string;
      slug: string | null;
      updated_at: string;
    }>;

    const experiences = (experiencesResult.data ?? []) as Array<{
      id: string;
      title: string;
      updated_at: string;
    }>;

    categoryRoutes = categories.map((cat) => ({
      url: `${SITE_URL}/explore/category/${encodeURIComponent(buildCategorySlug({ title: cat.title, slug: cat.slug }))}`,
      lastModified: new Date(cat.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    experienceRoutes = experiences.map((exp) => ({
      url: `${SITE_URL}/experience/${buildExperienceSlug({ title: exp.title, id: exp.id })}`,
      lastModified: new Date(exp.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Supabase unavailable at build time — static routes still served
  }

  return [...staticRoutes, ...categoryRoutes, ...experienceRoutes];
}
