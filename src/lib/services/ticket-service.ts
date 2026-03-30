import { apiClient } from '@/lib/api';
import type { HDTicket, HDCommunication, CreateTicketData, FrappeResponse } from '@/types/frappe';
import type { ITicketService } from './types';
import { TICKET_FIELDS, REPLY_FIELDS } from './types';

export class TicketService implements ITicketService {
  async getTickets(filters?: Record<string, unknown>): Promise<HDTicket[]> {
    const params: Record<string, string> = {
      fields: JSON.stringify(TICKET_FIELDS),
    };
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    const response = await apiClient.get<FrappeResponse<HDTicket>>('/resource/HD Ticket', { params });
    return response.data;
  }

  async getTicket(id: string): Promise<HDTicket> {
    const response = await apiClient.get<{ data: HDTicket }>(`/resource/HD Ticket/${id}`);
    return response.data;
  }

  async createTicket(data: CreateTicketData): Promise<HDTicket> {
    const response = await apiClient.post<{ data: HDTicket }>('/resource/HD Ticket', data);
    return response.data;
  }

  async updateTicket(id: string, data: Partial<HDTicket>): Promise<HDTicket> {
    const response = await apiClient.put<{ data: HDTicket }>(`/resource/HD Ticket/${id}`, data);
    return response.data;
  }

  async searchTickets(query: string): Promise<HDTicket[]> {
    const response = await apiClient.get<FrappeResponse<HDTicket>>('/resource/HD Ticket', {
      params: {
        filters: JSON.stringify({ subject: ['like', `%${query}%`] }),
        fields: JSON.stringify(TICKET_FIELDS),
      },
    });
    return response.data;
  }

  async getTicketReplies(ticketId: string): Promise<HDCommunication[]> {
    const response = await apiClient.get<FrappeResponse<HDCommunication>>('/resource/HD Ticket Comment', {
      params: {
        filters: JSON.stringify({ reference_ticket: ticketId }),
        fields: JSON.stringify(REPLY_FIELDS),
        order_by: 'creation asc',
      },
    });
    return response.data;
  }

  async addTicketReply(ticketId: string, content: string): Promise<HDCommunication> {
    const response = await apiClient.post<{ data: HDCommunication }>('/resource/HD Ticket Comment', {
      reference_ticket: ticketId,
      content,
    });
    return response.data;
  }
}
