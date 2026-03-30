import type { HDArticle } from '@/types/frappe';
import type { IArticleService } from './types';
import { DEMO_ARTICLES } from '@/lib/demo-data';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DemoArticleService implements IArticleService {
  async getArticles(): Promise<HDArticle[]> {
    await delay(200);
    return DEMO_ARTICLES;
  }

  async getArticle(id: string): Promise<HDArticle> {
    await delay(150);
    const article = DEMO_ARTICLES.find((a) => a.name === id);
    if (!article) throw new Error('Article not found');
    return article;
  }

  async searchArticles(query: string): Promise<HDArticle[]> {
    await delay(200);
    const q = query.toLowerCase();
    return DEMO_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
  }
}
