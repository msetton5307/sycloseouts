import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import ChatMessage from "@/components/messages/chat-message";
import { useAdminUserMessages } from "@/hooks/use-messages";

export default function AdminMessagesPage() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number>();

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.username} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const { data: messages = [], isLoading } = useAdminUserMessages(selectedUser ?? 0);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Message Supervision</h1>
        <div className="flex gap-4">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Search users"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="border rounded p-2"
            value={selectedUser ?? ""}
            onChange={e => setSelectedUser(Number(e.target.value) || undefined)}
          >
            <option value="">Select User</option>
            {filteredUsers.map(u => (
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
              <ChatMessage key={m.id} message={m} isOwn={m.senderId === selectedUser} />
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}