import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type Category = {
  id: string;
  slug: string | null;
  title: {
    en: string;
    fr: string;
    ar: string;
  };
  description: string | null;
  is_active: boolean;
  asset: string | null;
  created_at: string;
  updated_at: string;
};

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = createClient();
      const db = supabase as any;

      // 1. Fetch all active categories
      const { data: allCategories, error: categoriesError } = await db
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (categoriesError) {
        console.error(
          "[useCategories] Failed to fetch categories",
          categoriesError,
        );
        throw categoriesError;
      }

      // 2. Fetch categories that have published experiences
      const { data: usedCategoriesData, error: usedCategoriesError } = await db
        .from("experience_categories")
        .select(`
          category_id,
          experience:experiences!inner(status, deleted_at)
        `)
        .eq("experience.status", "published")
        .is("experience.deleted_at", null);

      if (usedCategoriesError) {
        console.error(
          "[useCategories] Failed to fetch used categories",
          usedCategoriesError,
        );
        throw usedCategoriesError;
      }

      const experienceCountByCategory = new Map<string, number>();
      const categoryRows = (allCategories ?? []) as Category[];
      const usedCategoryRows = (usedCategoriesData ?? []) as Array<{
        category_id: string;
      }>;

      for (const item of usedCategoryRows) {
        const categoryId = item.category_id;
        experienceCountByCategory.set(
          categoryId,
          (experienceCountByCategory.get(categoryId) ?? 0) + 1,
        );
      }

      const filteredCategories = categoryRows
        .filter((category) => experienceCountByCategory.has(category.id))
        .sort(
          (a, b) =>
            (experienceCountByCategory.get(b.id) ?? 0) -
            (experienceCountByCategory.get(a.id) ?? 0),
        );

      return filteredCategories;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
