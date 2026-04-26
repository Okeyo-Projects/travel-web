export interface WpAuthor {
  name: string;
  slug: string;
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
}

export interface WpFeaturedMedia {
  source_url: string;
  alt_text: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  modified: string;
  author: WpAuthor;
  categories: number[];
  categoryDetails: WpCategory[];
  featuredMedia: WpFeaturedMedia | null;
  featuredMediaId: number;
}

export interface BlogListResponse {
  posts: BlogPost[];
  totalPages: number;
  total: number;
  currentPage: number;
}
