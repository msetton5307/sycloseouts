import { useParams } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useConversation } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import ChatMessage from "@/components/messages/chat-message";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import ConversationPreview from "@/components/messages/conversation-preview";

export default function ConversationPage() {
  const { id } = useParams();
  const otherId = parseInt(id);
  const { user } = useAuth();
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  const others = user?.role === "buyer"
    ? Array.from(new Set(orders.map(o => o.sellerId)))
    : Array.from(new Set(orders.map(o => o.buyerId)));
  const { data: messages = [], isLoading, sendMessage, markRead } = useConversation(otherId);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScroll = useRef(true);

  useEffect(() => {
    if (otherId) {
      markRead.mutate();
    }
  }, [otherId]);

  useEffect(() => {
    if (initialScroll.current) {
      initialScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    initialScroll.current = true;
  }, [otherId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (!value) return;
    sendMessage.mutate(value);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-4 flex h-[calc(100vh-8rem)]">
        <div className="hidden md:block w-64 border-r overflow-y-auto bg-white shadow-sm">
          {others.map(id => (
            <ConversationPreview key={id} otherId={id} selected={id === otherId} />
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <h1 className="text-xl font-semibold mb-2">Conversation</h1>
          <div className="flex-1 overflow-y-auto space-y-2 bg-gray-50 border rounded p-4">
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              messages.map(m => (
                <ChatMessage key={m.id} message={m} isOwn={m.senderId === user?.id} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border rounded-full px-3 py-2"
              placeholder="Type a message"
            />
            <button
              type="submit"
              className="bg-primary text-white px-4 rounded-full"
            >
              Send
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

