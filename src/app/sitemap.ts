import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildCategorySlug, buildExperienceSlug } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "/",
    "/explore",
    "/collections",
    "/chat",
    "/preorder",
    "/support",
    "/terms",
    "/privacy",
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localizeHref(path, locale)}`,
      lastModified: now,
      changeFrequency:
        path === "/"
          ? ("weekly" as const)
          : path === "/explore"
            ? ("daily" as const)
            : path === "/collections"
              ? ("weekly" as const)
              : path === "/chat"
                ? ("monthly" as const)
                : path === "/preorder"
                  ? ("monthly" as const)
                  : path === "/support"
                    ? ("monthly" as const)
                    : ("yearly" as const),
      priority:
        path === "/"
          ? 1.0
          : path === "/explore"
            ? 0.9
            : path === "/collections"
              ? 0.8
              : path === "/chat"
                ? 0.7
                : path === "/preorder"
                  ? 0.6
                  : path === "/support"
                    ? 0.5
                    : 0.3,
    })),
  );

  let categoryRoutes: MetadataRoute.Sitemap = [];
  let experienceRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    // Fetch active categories that have published experiences
    const [categoriesResult, experiencesResult] = await Promise.all([
      supabase
        .from("categories" as never)
        .select("*")
        .eq("is_active" as never, true),
      supabase
        .from("experiences" as never)
        .select("id, title, updated_at")
        .eq("status" as never, "published"),
    ]);

    const categories = (categoriesResult.data ?? []) as Array<{
      title: { fr?: string; en?: string; ar?: string } | string;
      slug?: string | null;
      updated_at: string;
    }>;

    const experiences = (experiencesResult.data ?? []) as Array<{
      id: string;
      title: string;
      updated_at: string;
    }>;

    categoryRoutes = categories.flatMap((cat) => {
      const path = `/explore/category/${encodeURIComponent(
        buildCategorySlug({ title: cat.title, slug: cat.slug }),
      )}`;

      return LOCALES.map((locale) => ({
        url: `${SITE_URL}${localizeHref(path, locale)}`,
        lastModified: new Date(cat.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    });

    experienceRoutes = experiences.flatMap((exp) => {
      const path = `/experience/${buildExperienceSlug({
        title: exp.title,
        id: exp.id,
      })}`;

      return LOCALES.map((locale) => ({
        url: `${SITE_URL}${localizeHref(path, locale)}`,
        lastModified: new Date(exp.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    });
  } catch {
    // Supabase unavailable at build time — static routes still served
  }

  return [...staticRoutes, ...categoryRoutes, ...experienceRoutes];
}
