import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmailTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useEmailTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject: string; body: string }) =>
      apiRequest("POST", "/api/admin/email-templates", data).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] }),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; values: Partial<EmailTemplate> }) =>
      apiRequest("PUT", `/api/admin/email-templates/${data.id}`, data.values).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] }),
  });
}

export function useSendEmailTemplate() {
  return useMutation((data: { id: number; group: string }) =>
    apiRequest("POST", `/api/admin/email-templates/${data.id}/send`, { group: data.group })
  );
}
