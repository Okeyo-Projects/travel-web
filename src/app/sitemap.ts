import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "/",
    "/explore",
    "/blog",
    "/about",
    "/support",
    "/terms",
    "/privacy",
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localizeHref(path, locale)}`,
      lastModified: now,
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
    // Only emit FR blog posts until EN/AR translations exist (Track B)
    blogPostRoutes = wpPosts.value
      .filter(({ locale }) => locale === "fr")
      .map(({ slug, modified, locale }) => ({
        url: `${SITE_URL}${localizeHref(`/blog/${slug}`, locale)}`,
        lastModified: new Date(modified),
      }));
  }

  if (wpCategories.status === "fulfilled") {
    // Only emit FR blog categories until EN/AR translations exist
    blogCategoryRoutes = wpCategories.value
      .filter(({ locale }) => locale === "fr")
      .map(({ slug, locale }) => ({
        url: `${SITE_URL}${localizeHref(`/blog/category/${slug}`, locale)}`,
        lastModified: now,
      }));
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

        return paths.flatMap((path) =>
          LOCALES.map((locale) => ({
            url: `${SITE_URL}${localizeHref(path, locale)}`,
            lastModified: new Date(cat.updated_at),
          })),
        );
      });

    experienceRoutes = experiences
      .filter(
        (exp) =>
          exp.city &&
          exp.title &&
          !exp.title.toLowerCase().includes("test"),
      )
      .flatMap((exp) => {
        const path = buildExperienceHref({
          title: exp.title,
          id: exp.id,
          slug: exp.slug,
          city: exp.city,
          region: exp.region,
        });

        return LOCALES.map((locale) => ({
          url: `${SITE_URL}${localizeHref(localizeExperiencePath(path, locale), locale)}`,
          lastModified: new Date(exp.updated_at),
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
