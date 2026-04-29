import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { BlogCard } from "@/components/blog/BlogCard";
import { CategorySidebar } from "@/components/blog/CategorySidebar";
import { FooterSection } from "@/components/home/FooterSection";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { fetchCategories, fetchPosts } from "@/lib/wordpress";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 1800;

async function getRequestTranslator() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  return { locale, t: createTranslator(locale) };
}

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const { locale, t } = await getRequestTranslator();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const canonicalPath = page > 1 ? `/blog?page=${page}` : "/blog";

  return {
    title: t("seo.blog.title"),
    description: t("seo.blog.description"),
    alternates: buildLocaleAlternates(canonicalPath, locale),
    openGraph: {
      title: t("seo.blog.title"),
      description: t("seo.blog.description"),
      url: localizeHref(canonicalPath, locale),
    },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { locale, t } = await getRequestTranslator();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [postsData, categories] = await Promise.all([
    fetchPosts(page, 9, undefined, locale),
    fetchCategories(locale),
  ]);

  const blogHref = localizeHref("/blog", locale);
  const categoryBaseHref = localizeHref("/blog/category", locale);
  const { posts, totalPages, currentPage } = postsData;

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: t("seo.blog.title"),
            description: t("seo.blog.description"),
            url: `${SITE_URL}${blogHref}`,
            inLanguage: locale,
          },
        ]}
      />

      <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#08090d_0%,#141a26_48%,#57132b_100%)] px-6 pb-14 pt-6 text-white">
        <div className="mx-auto max-w-6xl">
          <MarketingHeader />
          <div className="mt-14 space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("blog.title")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {t("blog.subtitle")}
            </p>
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
                        href={`${blogHref}?page=${currentPage - 1}`}
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
                            href={`${blogHref}?page=${p}`}
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
                        href={`${blogHref}?page=${currentPage + 1}`}
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
