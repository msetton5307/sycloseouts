import { useParams } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import { format } from "date-fns";

export default function OrderMessagesPage() {
  const { id } = useParams();
  const orderId = parseInt(id);
  const { user } = useAuth();
  const { data: messages = [], isLoading, sendMessage, markRead } = useMessages(orderId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (orderId) {
      markRead.mutate();
    }
  }, [orderId]);

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
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <div className="border rounded p-4 h-80 overflow-y-auto space-y-2 bg-gray-50">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.senderId === user?.id ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-xs px-3 py-2 rounded-lg ${m.senderId === user?.id ? "bg-primary text-white" : "bg-white"}`}>{m.content}</div>
                <div className="text-xs text-gray-500 self-end ml-2">{format(new Date(m.createdAt), "PP p")}</div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input ref={inputRef} className="flex-1 border rounded px-2 py-1" placeholder="Type a message" />
          <button type="submit" className="bg-primary text-white px-4 rounded">Send</button>
        </form>
      </main>
      <Footer />
    </>
  );
}