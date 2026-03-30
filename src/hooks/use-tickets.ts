'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTicketService } from '@/lib/services';
import type { CreateTicketData } from '@/types/frappe';

const service = getTicketService();

export function useTickets(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => service.getTickets(filters),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => service.getTicket(id),
    enabled: !!id,
  });
}

export function useTicketReplies(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => service.getTicketReplies(ticketId),
    enabled: !!ticketId,
    refetchInterval: 30 * 1000, // Poll for new replies every 30s
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketData) => service.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAddReply(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => service.addTicketReply(ticketId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies', ticketId] });
    },
  });
}

export function useSearchTickets() {
  const queryClient = useQueryClient();
  return {
    search: async (query: string) => {
      return queryClient.fetchQuery({
        queryKey: ['ticket-search', query],
        queryFn: () => service.searchTickets(query),
        staleTime: 10 * 1000,
      });
    },
  };
}
