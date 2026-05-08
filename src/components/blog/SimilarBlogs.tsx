import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n";
import { getDateFnsLocale } from "@/lib/i18n";
import type { BlogPost } from "@/types/blog";

interface SimilarBlogsProps {
  posts: BlogPost[];
  title: string;
  blogHref: string;
  locale: AppLocale;
}

export function SimilarBlogs({
  posts,
  title,
  blogHref,
  locale,
}: SimilarBlogsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const imageUrl = post.featuredMedia?.source_url;
          const dateStr = post.date
            ? format(new Date(post.date), "dd/MM/yyyy", {
                locale: getDateFnsLocale(locale),
              })
            : "";

          return (
            <Link
              key={post.id}
              href={`${blogHref}/${post.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={post.featuredMedia?.alt_text || post.title.rendered}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <span className="text-4xl">📝</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <time className="text-xs text-slate-500" dateTime={post.date}>
                  {dateStr}
                </time>
                <h3
                  className="mt-1 text-base font-semibold text-slate-900 transition-colors group-hover:text-primary"
                  dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
