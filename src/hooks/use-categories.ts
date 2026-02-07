import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type Category = {
  id: string;
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
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = createClient();
      const db = supabase as any;
      
      // 1. Fetch all active categories
      const { data: allCategories, error: categoriesError } = await db
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (categoriesError) {
        console.error('[useCategories] Failed to fetch categories', categoriesError);
        throw categoriesError;
      }

      // 2. Fetch categories that have published experiences
      const { data: usedCategoriesData, error: usedCategoriesError } = await db
        .from('experience_categories')
        .select(`
          category_id,
          experience:experiences!inner(status)
        `)
        .eq('experience.status', 'published');

      if (usedCategoriesError) {
        console.error('[useCategories] Failed to fetch used categories', usedCategoriesError);
        throw usedCategoriesError;
      }

      // Extract unique used category IDs
      const usedCategoryIds = new Set(usedCategoriesData?.map((item: any) => item.category_id) || []);

      // 3. Filter categories
      const filteredCategories = (allCategories ?? []).filter((c: any) => usedCategoryIds.has(c.id));

      return filteredCategories as Category[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
