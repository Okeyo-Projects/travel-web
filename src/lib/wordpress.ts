import type {
  BlogListResponse,
  BlogPost,
  WpCategory,
  WpFeaturedMedia,
} from "@/types/blog";

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL ?? "";

function baseUrl(): string {
  return `${WP_API_URL}/wp-json/wp/v2`;
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

export async function fetchCategories(): Promise<WpCategory[]> {
  const { data } = await fetchWp<WpCategory[]>("/categories", {
    per_page: "100",
    hide_empty: "true",
  });
  return data;
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<WpCategory | null> {
  try {
    const { data } = await fetchWp<WpCategory[]>("/categories", {
      slug,
    });
    return data[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchPosts(
  page = 1,
  perPage = 9,
  categoryId?: number,
): Promise<BlogListResponse> {
  const params: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
    _embed: "1",
    orderby: "date",
    order: "desc",
  };

  if (categoryId) {
    params.categories = String(categoryId);
  }

  const {
    data: rawPosts,
    totalPages,
    total,
  } = await fetchWp<Record<string, unknown>[]>("/posts", params);

  const allCategoryIds = [
    ...new Set(rawPosts.flatMap((p) => (p.categories as number[]) ?? [])),
  ];
  const categoriesMap: Record<number, WpCategory> = {};
  if (allCategoryIds.length > 0) {
    const catParams: Record<string, string> = {
      include: allCategoryIds.join(","),
      per_page: "100",
    };
    const { data: cats } = await fetchWp<WpCategory[]>(
      "/categories",
      catParams,
    );
    for (const cat of cats) {
      categoriesMap[cat.id] = cat;
    }
  }

  const posts = await Promise.all(
    rawPosts.map(async (raw) => {
      const author = await resolveAuthors(raw);
      const media = await resolveFeaturedMedia(
        (raw.featured_media as number) ?? null,
      );
      const postCats = ((raw.categories as number[]) ?? [])
        .map((id) => categoriesMap[id])
        .filter(Boolean) as WpCategory[];
      return toBlogPost(raw, author, media, postCats);
    }),
  );

  return { posts, totalPages, total, currentPage: page };
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data: rawPosts } = await fetchWp<Record<string, unknown>[]>(
      "/posts",
      { slug, _embed: "1" },
    );
    const raw = rawPosts[0];
    if (!raw) return null;

    const author = await resolveAuthors(raw);
    const media = await resolveFeaturedMedia(
      (raw.featured_media as number) ?? null,
    );
    const catIds = (raw.categories as number[]) ?? [];
    let categories: WpCategory[] = [];
    if (catIds.length > 0) {
      const { data: cats } = await fetchWp<WpCategory[]>("/categories", {
        include: catIds.join(","),
        per_page: "100",
      });
      categories = cats;
    }

    return toBlogPost(raw, author, media, categories);
  } catch {
    return null;
  }
}

export async function fetchAllPostsForSitemap(): Promise<
  { slug: string; modified: string }[]
> {
  const results: { slug: string; modified: string }[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const { data, totalPages } = await fetchWp<Record<string, unknown>[]>(
        "/posts",
        {
          page: String(page),
          per_page: String(perPage),
          _fields: "slug,modified",
          orderby: "modified",
          order: "desc",
        },
      );
      for (const p of data) {
        results.push({
          slug: p.slug as string,
          modified: p.modified as string,
        });
      }
      if (page >= totalPages) break;
      page++;
    }
  } catch {
    // WordPress unavailable — return what we have
  }

  return results;
}

export async function fetchAllCategoriesForSitemap(): Promise<
  { slug: string }[]
> {
  try {
    const { data } = await fetchWp<{ slug: string }[]>("/categories", {
      per_page: "100",
      hide_empty: "true",
      _fields: "slug",
    });
    return data;
  } catch {
    return [];
  }
}

export async function fetchRelatedPosts(
  postId: number,
  categoryIds: number[],
  count = 3,
): Promise<BlogPost[]> {
  if (categoryIds.length === 0) return [];

  try {
    const { data: rawPosts } = await fetchWp<Record<string, unknown>[]>(
      "/posts",
      {
        categories: categoryIds.join(","),
        per_page: String(count + 1),
        orderby: "date",
        order: "desc",
        _embed: "1",
      },
    );

    const filtered = rawPosts
      .filter((p) => (p.id as number) !== postId)
      .slice(0, count);

    return Promise.all(
      filtered.map(async (raw) => {
        const author = await resolveAuthors(raw);
        const media = await resolveFeaturedMedia(
          (raw.featured_media as number) ?? null,
        );
        const catIds = (raw.categories as number[]) ?? [];
        let categories: WpCategory[] = [];
        if (catIds.length > 0) {
          const { data: cats } = await fetchWp<WpCategory[]>("/categories", {
            include: catIds.join(","),
            per_page: "100",
          });
          categories = cats;
        }
        return toBlogPost(raw, author, media, categories);
      }),
    );
  } catch {
    return [];
  }
}
