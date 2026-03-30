import { isDemoMode } from '@/lib/demo-data';
import type { ITicketService, IArticleService } from './types';
import { TicketService } from './ticket-service';
import { ArticleService } from './article-service';
import { DemoTicketService } from './demo-ticket-service';
import { DemoArticleService } from './demo-article-service';

let ticketService: ITicketService | null = null;
let articleService: IArticleService | null = null;

export function getTicketService(): ITicketService {
  if (!ticketService) {
    ticketService = isDemoMode() ? new DemoTicketService() : new TicketService();
  }
  return ticketService;
}

export function getArticleService(): IArticleService {
  if (!articleService) {
    articleService = isDemoMode() ? new DemoArticleService() : new ArticleService();
  }
  return articleService;
}

export type { ITicketService, IArticleService } from './types';
