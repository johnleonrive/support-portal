'use client';

import { useQuery } from '@tanstack/react-query';
import { getArticleService } from '@/lib/services';
import { apiClient } from '@/lib/api';

const service = getArticleService();

export function useArticles() {
  return useQuery({
    queryKey: ['articles'],
    queryFn: () => service.getArticles(),
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => service.getArticle(id),
    enabled: !!id,
  });
}

interface CategoryRecord {
  name: string;
  category_name: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ['article-categories'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CategoryRecord[] }>(
        '/resource/HD Article Category?fields=["name","category_name"]&limit_page_length=50'
      );
      const map: Record<string, string> = {};
      for (const cat of response.data) {
        map[cat.name] = cat.category_name;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000, // categories rarely change
  });
}
