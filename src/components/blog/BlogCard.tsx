import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/types/blog";

interface BlogCardProps {
  post: BlogPost;
  blogHref: string;
  readMoreLabel: string;
}

export function BlogCard({ post, blogHref, readMoreLabel }: BlogCardProps) {
  const imageUrl = post.featuredMedia?.source_url;
  const dateStr = post.date
    ? format(new Date(post.date), "d MMMM yyyy", { locale: fr })
    : "";

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <Link href={`${blogHref}/${post.slug}`} className="block">
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
      </Link>

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="size-3.5" />
          <time dateTime={post.date}>{dateStr}</time>
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-slate-900">
          <Link
            href={`${blogHref}/${post.slug}`}
            className="hover:text-primary transition-colors"
            dangerouslySetInnerHTML={{ __html: post.title.rendered }}
          />
        </h3>

        <div
          className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600"
          dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
        />

        <Link
          href={`${blogHref}/${post.slug}`}
          className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          {readMoreLabel} &rarr;
        </Link>
      </div>
    </article>
  );
}
