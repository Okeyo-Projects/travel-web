import type { MetadataRoute } from "next";
import { LOCALES, type AppLocale } from "@/lib/i18n";
import {
  localizeExperiencePath,
  localizeHref,
} from "@/lib/routing/locale-path";
import { buildCategorySlug, buildExperienceHref } from "@/lib/routing/slugs";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAllCategoriesForSitemap,
  fetchAllPostsForSitemap,
} from "@/lib/wordpress";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

function toDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function buildAlternates(
  pathBuilder: (locale: AppLocale) => string,
): { languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}${pathBuilder(locale)}`;
  }
  languages["x-default"] = languages["fr"];
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/explore", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/blog", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/chat", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/partner", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/support", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap((route) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localizeHref(route.path, locale)}`,
      lastModified: toDateString(now),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: buildAlternates((l) => localizeHref(route.path, l)),
    })),
  );

  let categoryRoutes: MetadataRoute.Sitemap = [];
  let experienceRoutes: MetadataRoute.Sitemap = [];
  let blogPostRoutes: MetadataRoute.Sitemap = [];
  let blogCategoryRoutes: MetadataRoute.Sitemap = [];

  const [wpPosts, wpCategories] = await Promise.allSettled([
    fetchAllPostsForSitemap(),
    fetchAllCategoriesForSitemap(),
  ]);

  if (wpPosts.status === "fulfilled") {
    const postsBySlug = new Map<
      string,
      Array<{ slug: string; modified: string; locale: AppLocale }>
    >();
    for (const post of wpPosts.value) {
      const group = postsBySlug.get(post.slug) ?? [];
      group.push(post);
      postsBySlug.set(post.slug, group);
    }

    blogPostRoutes = Array.from(postsBySlug.values()).flatMap((group) => {
      const languages: Record<string, string> = {};
      for (const post of group) {
        languages[post.locale] = `${SITE_URL}${localizeHref(`/blog/${post.slug}`, post.locale)}`;
      }
      languages["x-default"] =
        languages["fr"] ?? `${SITE_URL}${localizeHref(`/blog/${group[0].slug}`, "fr")}`;

      return group.map((post) => ({
        url: `${SITE_URL}${localizeHref(`/blog/${post.slug}`, post.locale)}`,
        lastModified: toDateString(new Date(post.modified)),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: { languages },
      }));
    });
  }

  if (wpCategories.status === "fulfilled") {
    const categoriesBySlug = new Map<
      string,
      Array<{ slug: string; locale: AppLocale }>
    >();
    for (const cat of wpCategories.value) {
      const group = categoriesBySlug.get(cat.slug) ?? [];
      group.push(cat);
      categoriesBySlug.set(cat.slug, group);
    }

    blogCategoryRoutes = Array.from(categoriesBySlug.values()).flatMap(
      (group) => {
        const languages: Record<string, string> = {};
        for (const cat of group) {
          languages[cat.locale] = `${SITE_URL}${localizeHref(`/blog/category/${cat.slug}`, cat.locale)}`;
        }
        languages["x-default"] =
          languages["fr"] ??
          `${SITE_URL}${localizeHref(`/blog/category/${group[0].slug}`, "fr")}`;

        return group.map((cat) => ({
          url: `${SITE_URL}${localizeHref(`/blog/category/${cat.slug}`, cat.locale)}`,
          lastModified: toDateString(now),
          changeFrequency: "monthly" as const,
          priority: 0.5,
          alternates: { languages },
        }));
      },
    );
  }

  try {
    const supabase = await createClient();

    const [categoriesResult, experiencesResult] = await Promise.all([
      supabase
        .from("categories" as never)
        .select(`
          id,
          title,
          slug,
          updated_at,
          experience_categories(
            experience:experiences!inner(
              id,
              status
            )
          )
        `)
        .eq("is_active" as never, true),
      supabase
        .from("experiences" as never)
        .select("id, title, slug, city, region, updated_at")
        .eq("status" as never, "published")
        .not("city", "is", null)
        .not("title", "is", null),
    ]);

    const categories = (categoriesResult.data ?? []) as Array<{
      id: string;
      title: { fr?: string; en?: string; ar?: string } | string;
      slug?: string | null;
      updated_at: string;
      experience_categories?: Array<{
        experience: { id: string; status: string };
      }>;
    }>;

    const experiences = (experiencesResult.data ?? []) as Array<{
      id: string;
      title: string;
      slug?: string | null;
      city: string;
      region?: string | null;
      updated_at: string;
    }>;

    categoryRoutes = categories
      .filter((cat) => {
        const hasPublishedExperience =
          cat.experience_categories?.some(
            (ec) => ec.experience.status === "published",
          ) ?? false;
        return hasPublishedExperience;
      })
      .flatMap((cat) => {
        const slug = buildCategorySlug({ title: cat.title, slug: cat.slug });
        const paths = [`/explore/region/${slug}`, `/explore/category/${slug}`];

        return paths.flatMap((path) => {
          const alternates = buildAlternates((l) => localizeHref(path, l));

          return LOCALES.map((locale) => ({
            url: `${SITE_URL}${localizeHref(path, locale)}`,
            lastModified: toDateString(new Date(cat.updated_at)),
            changeFrequency: "monthly" as const,
            priority: 0.8,
            alternates,
          }));
        });
      });

    experienceRoutes = experiences
      .filter(
        (exp) =>
          exp.city && exp.title && !exp.title.toLowerCase().includes("test"),
      )
      .flatMap((exp) => {
        const path = buildExperienceHref({
          title: exp.title,
          id: exp.id,
          slug: exp.slug,
          city: exp.city,
          region: exp.region,
        });

        const alternates = buildAlternates((l) =>
          localizeHref(localizeExperiencePath(path, l), l),
        );

        return LOCALES.map((locale) => ({
          url: `${SITE_URL}${localizeHref(localizeExperiencePath(path, locale), locale)}`,
          lastModified: toDateString(new Date(exp.updated_at)),
          changeFrequency: "monthly" as const,
          priority: 0.8,
          alternates,
        }));
      });
  } catch {
    // Supabase unavailable at build time — static routes still served
  }

  return [
    ...staticRoutes,
    ...blogPostRoutes,
    ...blogCategoryRoutes,
    ...categoryRoutes,
    ...experienceRoutes,
  ];
}
