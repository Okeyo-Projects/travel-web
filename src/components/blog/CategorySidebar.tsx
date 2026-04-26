import Link from "next/link";
import type { WpCategory } from "@/types/blog";

interface CategorySidebarProps {
  categories: WpCategory[];
  blogHref: string;
  categoryBaseHref: string;
  title: string;
  allLabel: string;
  activeCategorySlug?: string;
}

export function CategorySidebar({
  categories,
  blogHref,
  categoryBaseHref,
  title,
  allLabel,
  activeCategorySlug,
}: CategorySidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {title}
        </p>
        <nav className="mt-4">
          <ul className="space-y-1">
            <li>
              <Link
                href={blogHref}
                className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors ${
                  !activeCategorySlug
                    ? "bg-primary/5 font-medium text-primary"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
              >
                <span>{allLabel}</span>
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`${categoryBaseHref}/${cat.slug}`}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors ${
                    activeCategorySlug === cat.slug
                      ? "bg-primary/5 font-medium text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {cat.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
