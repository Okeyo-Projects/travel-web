import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { type AppLocale, createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import {
  categoryMatchesSlug,
  resolveLocalizedTitle,
} from "@/lib/routing/slugs";
import {
  buildKeywords,
  buildPageTitle,
  resolveLocalizedText,
} from "@/lib/seo/page-metadata";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 1800;

async function fetchCategoryTitle(
  routeSlug: string,
  locale: AppLocale,
): Promise<{ title: string | null; description: string | null }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories" as never)
      .select("*")
      .eq("is_active" as never, true);
    const category = (
      data as Array<{
        id: string;
        title: { fr: string; en: string; ar: string };
        description:
          | string
          | { fr?: string | null; en?: string | null; ar?: string | null }
          | null;
        slug: string | null;
      }> | null
    )?.find((c) => categoryMatchesSlug(c, routeSlug));
    if (!category) {
      return { title: null, description: null };
    }
    return {
      title: resolveLocalizedTitle(category.title, locale) || null,
      description: resolveLocalizedText(category.description, locale),
    };
  } catch {
    return { title: null, description: null };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const routeSlug = decodeURIComponent(slug);
  const { title: categoryTitle, description: categoryDescription } =
    await fetchCategoryTitle(routeSlug, locale);
  const pageTitle = categoryTitle
    ? buildPageTitle(categoryTitle)
    : t("seo.category.title");
  const pageDescription = categoryTitle
    ? categoryDescription ||
      t("seo.category.descriptionPattern", { title: categoryTitle })
    : t("seo.category.description");
  const keywords = buildKeywords(categoryTitle, pageDescription);
  const href = `/explore/category/${slug}`;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords,
    alternates: buildLocaleAlternates(href, locale),
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: localizeHref(href, locale),
    },
  };
}

export default async function CategorySlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const routeSlug = decodeURIComponent(slug);
  const { title: categoryTitle } = await fetchCategoryTitle(routeSlug, locale);
  const categoryPath = `/explore/category/${slug}`;
  const categoryUrl = `${SITE_URL}${localizeHref(categoryPath, locale)}`;

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
              name: t("header.home"),
              item: `${SITE_URL}${localizeHref("/", locale)}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: t("header.explore"),
              item: `${SITE_URL}${localizeHref("/explore", locale)}`,
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
