import { apiClient } from '@/lib/api';
import type { HDArticle, FrappeResponse } from '@/types/frappe';
import type { IArticleService } from './types';
import { ARTICLE_FIELDS } from './types';

export class ArticleService implements IArticleService {
  async getArticles(): Promise<HDArticle[]> {
    const response = await apiClient.get<FrappeResponse<HDArticle>>(
      `/resource/HD Article?fields=${JSON.stringify(ARTICLE_FIELDS)}`
    );
    return response.data;
  }

  async getArticle(id: string): Promise<HDArticle> {
    const response = await apiClient.get<{ data: HDArticle }>(`/resource/HD Article/${id}`);
    return response.data;
  }

  async searchArticles(query: string): Promise<HDArticle[]> {
    const response = await apiClient.get<FrappeResponse<HDArticle>>('/resource/HD Article', {
      params: {
        fields: JSON.stringify(ARTICLE_FIELDS),
        filters: JSON.stringify({
          title: ['like', `%${query}%`],
          status: 'Published',
        }),
      },
    });
    return response.data;
  }
}
