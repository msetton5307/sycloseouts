import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupportTicket } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

export function useSupportTickets() {
  return useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; message: string; topic: string }) =>
      apiRequest("POST", "/api/support-tickets", data).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }),
  });
}

export function useRespondTicket(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (response: string) =>
      apiRequest("POST", `/api/support-tickets/${id}/respond`, { response }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }),
  });
}

export function useUpdateTicketStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      apiRequest("POST", `/api/support-tickets/${id}/status`, { status }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/support-tickets"] }),
  });
}