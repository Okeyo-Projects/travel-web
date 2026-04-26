import { SimilarBlogs } from "@/components/blog/SimilarBlogs";
import { FooterSection } from "@/components/home/FooterSection";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { fetchPostBySlug, fetchRelatedPosts } from "@/lib/wordpress";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, User } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 1800;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const post = await fetchPostBySlug(slug);

  if (!post) {
    return { title: t("seo.blog.fallbackTitle") };
  }

  const plainTitle = post.title.rendered.replace(/<[^>]*>/g, "");
  const plainExcerpt = sanitizeHtml(post.excerpt.rendered, {
    allowedTags: [],
  }).slice(0, 160);

  return {
    title: `${plainTitle} — ${t("app.name")}`,
    description: plainExcerpt,
    alternates: buildLocaleAlternates(`/blog/${slug}`),
    openGraph: {
      title: plainTitle,
      description: plainExcerpt,
      url: localizeHref(`/blog/${slug}`, locale),
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.modified,
      images: post.featuredMedia?.source_url
        ? [{ url: post.featuredMedia.source_url }]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = await fetchRelatedPosts(post.id, post.categories, 3);

  const blogHref = localizeHref("/blog", locale);
  const postUrl = `${SITE_URL}${localizeHref(`/blog/${slug}`, locale)}`;

  const plainTitle = post.title.rendered.replace(/<[^>]*>/g, "");

  const sanitizedContent = sanitizeHtml(post.content.rendered, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "u",
      "s",
      "del",
      "ins",
      "mark",
      "sub",
      "sup",
      "hr",
      "iframe",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "id", "style"],
      img: ["src", "alt", "width", "height", "class", "style", "loading", "decoding", "srcset", "sizes"],
      figure: ["class", "style"],
      figcaption: ["class", "style"],
      a: ["href", "target", "rel", "class", "style"],
      iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "loading"],
      td: ["colspan", "rowspan", "class", "style"],
      th: ["colspan", "rowspan", "class", "style"],
      ol: ["start", "class", "style"],
      blockquote: ["cite", "class", "style"],
    },
  });

  const imageUrl = post.featuredMedia?.source_url;
  const dateStr = post.date
    ? format(new Date(post.date), "d MMMM yyyy", { locale: fr })
    : "";

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: plainTitle,
            description: sanitizeHtml(post.excerpt.rendered, {
              allowedTags: [],
            }).slice(0, 300),
            datePublished: post.date,
            dateModified: post.modified,
            url: postUrl,
            image: post.featuredMedia?.source_url,
            author: post.author.name
              ? { "@type": "Person", name: post.author.name }
              : undefined,
            publisher: {
              "@type": "Organization",
              name: t("app.name"),
              url: SITE_URL,
            },
            inLanguage: locale,
          },
        ]}
      />

      <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#08090d_0%,#141a26_48%,#57132b_100%)] px-6 pb-10 pt-6 text-white">
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
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article>
          {imageUrl && (
            <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={imageUrl}
                alt={post.featuredMedia?.alt_text || post.title.rendered}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>
          )}

          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {dateStr && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  <time dateTime={post.date}>{dateStr}</time>
                </span>
              )}
              {post.author.name && (
                <span className="flex items-center gap-1.5">
                  <User className="size-4" />
                  {post.author.name}
                </span>
              )}
            </div>

            <h1
              className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl"
              dangerouslySetInnerHTML={{ __html: post.title.rendered }}
            />

            {post.categoryDetails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.categoryDetails.map((cat) => (
                  <span
                    key={cat.id}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className="blog-content mt-10"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <SimilarBlogs
            posts={relatedPosts}
            title={t("blog.similarPosts")}
            blogHref={blogHref}
          />
        </article>
      </main>

      <FooterSection />
    </div>
  );
}
