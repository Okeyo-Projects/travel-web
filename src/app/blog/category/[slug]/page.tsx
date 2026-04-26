import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { BlogCard } from "@/components/blog/BlogCard";
import { CategorySidebar } from "@/components/blog/CategorySidebar";
import { FooterSection } from "@/components/home/FooterSection";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import {
  fetchCategories,
  fetchCategoryBySlug,
  fetchPosts,
} from "@/lib/wordpress";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 1800;

interface BlogCategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: BlogCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const category = await fetchCategoryBySlug(slug);

  if (!category) {
    return { title: t("seo.blog.fallbackTitle") };
  }

  const plainDescription = sanitizeHtml(category.description, {
    allowedTags: [],
  }).slice(0, 160);
  const seoTitle = `${category.name} — ${t("app.name")}`;
  const categoryUrl = `${SITE_URL}${localizeHref(`/blog/category/${slug}`, locale)}`;

  return {
    title: seoTitle,
    description: plainDescription || t("seo.blog.description"),
    alternates: buildLocaleAlternates(`/blog/category/${slug}`, locale),
    openGraph: {
      title: seoTitle,
      description: plainDescription || t("seo.blog.description"),
      url: categoryUrl,
      type: "website",
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: BlogCategoryPageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  const [category, categories] = await Promise.all([
    fetchCategoryBySlug(slug),
    fetchCategories(),
  ]);

  if (!category) notFound();

  const pageParam = await searchParams;
  const page = Number(pageParam.page) || 1;

  const postsData = await fetchPosts(page, 9, category.id);

  const blogHref = localizeHref("/blog", locale);
  const categoryBaseHref = localizeHref("/blog/category", locale);
  const categoryUrl = `${SITE_URL}${localizeHref(`/blog/category/${slug}`, locale)}`;
  const { posts, totalPages, currentPage } = postsData;

  const plainDescription = sanitizeHtml(category.description, {
    allowedTags: [],
  }).slice(0, 300);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: category.name,
            description: plainDescription || t("seo.blog.description"),
            url: categoryUrl,
            isPartOf: {
              "@type": "Blog",
              name: t("seo.blog.title"),
              url: `${SITE_URL}${blogHref}`,
            },
            inLanguage: locale,
          },
        ]}
      />

      <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#08090d_0%,#141a26_48%,#57132b_100%)] px-6 pb-14 pt-6 text-white">
        <div className="mx-auto max-w-6xl">
          <MarketingHeader />
          <div className="mt-8">
            <Link
              href={blogHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              &larr; {t("blog.backToBlog")}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {category.name}
            </h1>
            {plainDescription && (
              <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
                {plainDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <CategorySidebar
            categories={categories}
            blogHref={blogHref}
            categoryBaseHref={categoryBaseHref}
            title={t("blog.categories")}
            allLabel={t("blog.allCategories")}
            activeCategorySlug={category.slug}
          />

          <div className="space-y-8">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-slate-500">{t("blog.noPosts")}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  {posts.map((post) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      blogHref={blogHref}
                      readMoreLabel={t("blog.readMore")}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={`${categoryBaseHref}/${slug}?page=${currentPage - 1}`}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary hover:text-primary"
                      >
                        {t("common.previous")}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 opacity-40">
                        {t("common.previous")}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <Link
                            key={p}
                            href={`${categoryBaseHref}/${slug}?page=${p}`}
                            className={`flex size-9 items-center justify-center rounded-full text-sm transition-colors ${
                              p === currentPage
                                ? "bg-primary text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                            }`}
                          >
                            {p}
                          </Link>
                        ),
                      )}
                    </div>

                    {currentPage < totalPages ? (
                      <Link
                        href={`${categoryBaseHref}/${slug}?page=${currentPage + 1}`}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary hover:text-primary"
                      >
                        {t("common.next")}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 opacity-40">
                        {t("common.next")}
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
