import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserStrike } from "@shared/schema";

export function useStrikes() {
  return useQuery<any[]>({ queryKey: ["/api/strikes"] });
}

export function useUserStrikes(userId: number) {
  return useQuery<UserStrike[]>({
    queryKey: ["/api/users/" + userId + "/strikes"],
    enabled: !!userId,
  });
}

export function useCreateStrike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: {
        userId: number;
        reason: string;
        suspensionDays?: number;
        permanent?: boolean;
      },
    ) => apiRequest("POST", "/api/strikes", data).then(r => r.json()),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/strikes"] });
      qc.invalidateQueries({ queryKey: ["/api/users/" + variables.userId + "/strikes"] });
    },
  });
}