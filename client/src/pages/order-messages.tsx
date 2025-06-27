import { useParams } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import ChatMessage from "@/components/messages/chat-message";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem } from "@shared/schema";
import ListingBanner from "@/components/messages/listing-banner";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

export default function OrderMessagesPage() {
  const { id } = useParams();
  const orderId = parseInt(id);
  const { user } = useAuth();
  const { data: order } = useQuery<Order & { items: OrderItemWithProduct[] }>({
    queryKey: ["/api/orders/" + orderId],
    enabled: !Number.isNaN(orderId),
  });
  const { data: messages = [], isLoading, sendMessage, markRead } = useMessages(orderId);
  const inputRef = useRef<HTMLInputElement>(null);

  const listing = order?.items?.[0];

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
      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-8rem)]">
        <h1 className="text-xl font-semibold mb-2">Order Messages</h1>
        {listing && (
          <ListingBanner
            productId={listing.productId}
            title={listing.productTitle}
            image={listing.productImages[0]}
          />
        )}
        <div className="flex-1 overflow-y-auto space-y-2 bg-gray-50 border rounded p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            messages.map(m => (
              <ChatMessage key={m.id} message={m} isOwn={m.senderId === user?.id} />
            ))
          )}
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
      </main>
      <Footer />
    </>
  );
}