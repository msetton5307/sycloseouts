import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import ChatMessage from "@/components/messages/chat-message";
import { useAdminConversation } from "@/hooks/use-messages";

export default function AdminMessagesPage() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [userA, setUserA] = useState<number>();
  const [userB, setUserB] = useState<number>();

  const { data: messages = [], isLoading } = useAdminConversation(userA ?? 0, userB ?? 0);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Message Supervision</h1>
        <div className="flex gap-4">
          <select
            className="border rounded p-2"
            value={userA ?? ""}
            onChange={e => setUserA(Number(e.target.value) || undefined)}
          >
            <option value="">Select User A</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
          <select
            className="border rounded p-2"
            value={userB ?? ""}
            onChange={e => setUserB(Number(e.target.value) || undefined)}
          >
            <option value="">Select User B</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 bg-gray-50 p-4 rounded h-96 overflow-y-auto">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            messages.map(m => (
              <ChatMessage key={m.id} message={m} isOwn={m.senderId === userA} />
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
