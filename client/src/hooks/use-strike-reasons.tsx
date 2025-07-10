import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StrikeReason } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useStrikeReasons() {
  return useQuery<StrikeReason[]>({ queryKey: ["/api/admin/strike-reasons"] });
}

export function useCreateStrikeReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; emailBody: string }) =>
      apiRequest("POST", "/api/admin/strike-reasons", data).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/strike-reasons"] }),
  });
}

export function useUpdateStrikeReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; values: Partial<StrikeReason> }) =>
      apiRequest("PUT", `/api/admin/strike-reasons/${data.id}`, data.values).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/strike-reasons"] }),
  });
}

export function useDeleteStrikeReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/strike-reasons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/strike-reasons"] }),
  });
}
