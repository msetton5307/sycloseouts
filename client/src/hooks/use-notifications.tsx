import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useNotifications() {
  const qc = useQueryClient();
  const query = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const clearNotification = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  return { ...query, markRead, clearNotification };
}

export function useUnreadNotifications() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });
  return data?.count ?? 0;
}
