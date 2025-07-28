import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductNote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useProductNotes(productId: number) {
  return useQuery<ProductNote[]>({
    queryKey: ["/api/admin/products/" + productId + "/notes"],
    enabled: !!productId,
  });
}

export function useCreateProductNote(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { note: string }) =>
      apiRequest("POST", `/api/admin/products/${productId}/notes`, data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/products/" + productId + "/notes"] });
    },
  });
}
