import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupportTicket } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useSupportTickets() {
  return useQuery<SupportTicket[]>({ queryKey: ["/api/support-tickets"] });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; message: string }) =>
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
