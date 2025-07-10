import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserNote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useUserNotes(userId: number) {
  return useQuery<UserNote[]>({
    queryKey: ["/api/admin/users/" + userId + "/notes"],
    enabled: !!userId,
  });
}

export function useCreateUserNote(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { note: string; relatedUserId?: number }) =>
      apiRequest("POST", `/api/admin/users/${userId}/notes`, data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users/" + userId + "/notes"] });
    },
  });
}
