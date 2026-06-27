import { type AppLocale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import type {
  BlogListResponse,
  BlogPost,
  WpCategory,
  WpFeaturedMedia,
} from "@/types/blog";

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL ?? "";
const WP_LANGUAGE_PARAM = "lang";

function normalizeWpBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/wp-admin$/, "")
    .replace(/\/wp-json(?:\/wp\/v2)?$/, "");
}

function baseUrl(): string {
  return `${normalizeWpBaseUrl(WP_API_URL)}/wp-json/wp/v2`;
}

function withLocaleParam(
  params: Record<string, string>,
  locale?: AppLocale,
): Record<string, string> {
  if (!locale) {
    return params;
  }

  return {
    ...params,
    [WP_LANGUAGE_PARAM]: locale,
  };
}

function getRecordLocale(record: Record<string, unknown>): AppLocale | null {
  const rawLocale = record.lang ?? record.language ?? record.locale;

  if (
    typeof rawLocale === "string" &&
    LOCALES.includes(rawLocale as AppLocale)
  ) {
    return rawLocale as AppLocale;
  }

  if (rawLocale && typeof rawLocale === "object") {
    const code =
      (rawLocale as { slug?: unknown; code?: unknown; locale?: unknown })
        .slug ??
      (rawLocale as { slug?: unknown; code?: unknown; locale?: unknown })
        .code ??
      (rawLocale as { slug?: unknown; code?: unknown; locale?: unknown })
        .locale;

    if (typeof code === "string" && LOCALES.includes(code as AppLocale)) {
      return code as AppLocale;
    }
  }

  return null;
}

function filterRecordsByLocale<T extends Record<string, unknown>>(
  records: T[],
  locale?: AppLocale,
): T[] {
  if (!locale) {
    return records;
  }

  const recordsWithLocale = records.filter((record) => getRecordLocale(record));

  if (recordsWithLocale.length === 0) {
    return locale === DEFAULT_LOCALE ? records : [];
  }

  return records.filter((record) => {
    const recordLocale = getRecordLocale(record);
    return recordLocale === locale;
  });
}

function filterCategoriesByLocale(
  categories: WpCategory[],
  locale?: AppLocale,
): WpCategory[] {
  return filterRecordsByLocale(
    categories as unknown as Record<string, unknown>[],
    locale,
  ) as unknown as WpCategory[];
}

async function fetchWp<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<{ data: T; totalPages: number; total: number }> {
  const url = new URL(`${baseUrl()}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`WordPress API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? 1);
  const total = Number(res.headers.get("X-WP-Total") ?? 0);

  return { data, totalPages, total };
}

async function resolveAuthors(
  post: Record<string, unknown>,
): Promise<{ name: string; slug: string }> {
  const authorId = post.author as number;
  try {
    const { data } = await fetchWp<{ name: string; slug: string }>(
      `/authors/${authorId}`,
    );
    return data;
  } catch {
    return { name: "", slug: "" };
  }
}

async function resolveFeaturedMedia(
  mediaId: number | null,
): Promise<WpFeaturedMedia | null> {
  if (!mediaId) return null;
  try {
    const { data } = await fetchWp<{ source_url: string; alt_text: string }>(
      `/media/${mediaId}`,
    );
    return data;
  } catch {
    return null;
  }
}

function extractEmbeddedMedia(
  raw: Record<string, unknown>,
): WpFeaturedMedia | null {
  const embedded = (raw._embedded as Record<string, unknown> | undefined) ?? {};
  const featuredMedia = (embedded["wp:featuredmedia"] as
    | Array<Record<string, unknown>>
    | undefined)?.[0];

  if (!featuredMedia) return null;

  const sourceUrl = featuredMedia.source_url as string | undefined;
  if (!sourceUrl) return null;

  return {
    source_url: sourceUrl,
    alt_text: (featuredMedia.alt_text as string) || "",
  };
}

function toBlogPost(
  raw: Record<string, unknown>,
  author: { name: string; slug: string },
  media: WpFeaturedMedia | null,
  categories: WpCategory[],
): BlogPost {
  return {
    id: raw.id as number,
    slug: raw.slug as string,
    title: raw.title as { rendered: string },
    excerpt: raw.excerpt as { rendered: string },
    content: raw.content as { rendered: string },
    date: raw.date as string,
    modified: raw.modified as string,
    author,
    categories: (raw.categories as number[]) ?? [],
    categoryDetails: categories,
    featuredMedia: media,
    featuredMediaId: (raw.featured_media as number) ?? 0,
  };
}

export async function fetchCategories(
  locale?: AppLocale,
): Promise<WpCategory[]> {
  const { data } = await fetchWp<WpCategory[]>("/categories", {
    ...withLocaleParam(
      {
        per_page: "100",
        hide_empty: "true",
      },
      locale,
    ),
  });
  return filterCategoriesByLocale(data, locale);
}

export async function fetchCategoryBySlug(
  slug: string,
  locale?: AppLocale,
): Promise<WpCategory | null> {
  try {
    const { data } = await fetchWp<WpCategory[]>("/categories", {
      ...withLocaleParam({ slug }, locale),
    });
    return filterCategoriesByLocale(data, locale)[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchPosts(
  page = 1,
  perPage = 9,
  categoryId?: number,
  locale?: AppLocale,
): Promise<BlogListResponse> {
  const params: Record<string, string> = withLocaleParam(
    {
      page: String(page),
      per_page: String(perPage),
      _embed: "1",
      orderby: "date",
      order: "desc",
    },
    locale,
  );

  if (categoryId) {
    params.categories = String(categoryId);
  }

  const {
    data: rawPosts,
    totalPages,
    total,
  } = await fetchWp<Record<string, unknown>[]>("/posts", params);

  const localePosts = filterRecordsByLocale(rawPosts, locale);

  const allCategoryIds = [
    ...new Set(localePosts.flatMap((p) => (p.categories as number[]) ?? [])),
  ];
  const categoriesMap: Record<number, WpCategory> = {};
  if (allCategoryIds.length > 0) {
    const catParams: Record<string, string> = withLocaleParam(
      {
        include: allCategoryIds.join(","),
        per_page: "100",
      },
      locale,
    );
    const { data: cats } = await fetchWp<WpCategory[]>(
      "/categories",
      catParams,
    );
    for (const cat of filterCategoriesByLocale(cats, locale)) {
      categoriesMap[cat.id] = cat;
    }
  }

  const posts = await Promise.all(
    localePosts.map(async (raw) => {
      const author = await resolveAuthors(raw);
      const media =
        extractEmbeddedMedia(raw) ??
        (await resolveFeaturedMedia((raw.featured_media as number) ?? null));
      const postCats = ((raw.categories as number[]) ?? [])
        .map((id) => categoriesMap[id])
        .filter(Boolean) as WpCategory[];
      return toBlogPost(raw, author, media, postCats);
    }),
  );

  return { posts, totalPages, total, currentPage: page };
}

export async function fetchPostBySlug(
  slug: string,
  locale?: AppLocale,
): Promise<BlogPost | null> {
  try {
    const { data: rawPosts } = await fetchWp<Record<string, unknown>[]>(
      "/posts",
      withLocaleParam({ slug, _embed: "1" }, locale),
    );
    const raw = filterRecordsByLocale(rawPosts, locale)[0];
    if (!raw) return null;

    const author = await resolveAuthors(raw);
    const media =
      extractEmbeddedMedia(raw) ??
      (await resolveFeaturedMedia((raw.featured_media as number) ?? null));
    const catIds = (raw.categories as number[]) ?? [];
    let categories: WpCategory[] = [];
    if (catIds.length > 0) {
      const { data: cats } = await fetchWp<WpCategory[]>("/categories", {
        ...withLocaleParam(
          {
            include: catIds.join(","),
            per_page: "100",
          },
          locale,
        ),
      });
      categories = filterCategoriesByLocale(cats, locale);
    }

    return toBlogPost(raw, author, media, categories);
  } catch {
    return null;
  }
}

export async function fetchAllPostsForSitemap(): Promise<
  { slug: string; modified: string; locale: AppLocale }[]
> {
  const results: { slug: string; modified: string; locale: AppLocale }[] = [];
  const perPage = 100;

  await Promise.all(
    LOCALES.map(async (locale) => {
      let page = 1;

      try {
        while (true) {
          const { data, totalPages } = await fetchWp<Record<string, unknown>[]>(
            "/posts",
            withLocaleParam(
              {
                page: String(page),
                per_page: String(perPage),
                _fields: "slug,modified,lang,language,locale",
                orderby: "modified",
                order: "desc",
              },
              locale,
            ),
          );
          for (const p of filterRecordsByLocale(data, locale)) {
            results.push({
              slug: p.slug as string,
              modified: p.modified as string,
              locale,
            });
          }
          if (page >= totalPages) break;
          page++;
        }
      } catch {
        // WordPress unavailable for this locale — return what we have
      }
    }),
  );

  return results;
}

export async function fetchAllCategoriesForSitemap(): Promise<
  { slug: string; locale: AppLocale }[]
> {
  const results: { slug: string; locale: AppLocale }[] = [];

  await Promise.all(
    LOCALES.map(async (locale) => {
      try {
        const { data } = await fetchWp<Record<string, unknown>[]>(
          "/categories",
          {
            ...withLocaleParam(
              {
                per_page: "100",
                hide_empty: "true",
                _fields: "slug,lang,language,locale",
              },
              locale,
            ),
          },
        );

        for (const category of filterRecordsByLocale(data, locale)) {
          results.push({
            slug: category.slug as string,
            locale,
          });
        }
      } catch {
        // WordPress unavailable for this locale — return what we have
      }
    }),
  );

  return results;
}

export async function fetchRelatedPosts(
  postId: number,
  categoryIds: number[],
  count = 3,
  locale?: AppLocale,
): Promise<BlogPost[]> {
  if (categoryIds.length === 0) return [];

  try {
    const { data: rawPosts } = await fetchWp<Record<string, unknown>[]>(
      "/posts",
      withLocaleParam(
        {
          categories: categoryIds.join(","),
          per_page: String(count + 1),
          orderby: "date",
          order: "desc",
          _embed: "1",
        },
        locale,
      ),
    );

    const filtered = filterRecordsByLocale(rawPosts, locale)
      .filter((p) => (p.id as number) !== postId)
      .slice(0, count);

    return Promise.all(
      filtered.map(async (raw) => {
        const author = await resolveAuthors(raw);
        const media =
          extractEmbeddedMedia(raw) ??
          (await resolveFeaturedMedia((raw.featured_media as number) ?? null));
        const catIds = (raw.categories as number[]) ?? [];
        let categories: WpCategory[] = [];
        if (catIds.length > 0) {
          const { data: cats } = await fetchWp<WpCategory[]>("/categories", {
            ...withLocaleParam(
              {
                include: catIds.join(","),
                per_page: "100",
              },
              locale,
            ),
          });
          categories = filterCategoriesByLocale(cats, locale);
        }
        return toBlogPost(raw, author, media, categories);
      }),
    );
  } catch {
    return [];
  }
}
