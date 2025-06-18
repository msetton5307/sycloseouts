import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Message, ProductQuestion } from "@shared/schema";

export function useMessages(orderId: number) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["/api/orders/" + orderId + "/messages"],
    enabled: !!orderId,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/orders/${orderId}/messages`, { message: content }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders/" + orderId + "/messages"] }),
  });

  const markRead = useMutation({
    mutationFn: () => apiRequest("POST", `/api/orders/${orderId}/messages/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] }),
  });

  return { ...messagesQuery, sendMessage, markRead };
}

export function useConversation(otherId: number) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["/api/conversations/" + otherId + "/messages"],
    enabled: !!otherId,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/conversations/${otherId}/messages`, { message: content }).then(r => r.json()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/" + otherId + "/messages"] }),
  });

  const markRead = useMutation({
    mutationFn: () => apiRequest("POST", `/api/conversations/${otherId}/messages/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] }),
  });

  return { ...messagesQuery, sendMessage, markRead };
}

export function useUnreadMessages() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
  });
  return data?.count ?? 0;
}

export function useProductQuestions() {
  return useQuery<ProductQuestion[]>({
    queryKey: ["/api/seller/questions"],
  });
}