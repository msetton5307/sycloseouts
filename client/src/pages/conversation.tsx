import { useParams, Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useConversation } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import ChatMessage from "@/components/messages/chat-message";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem } from "@shared/schema";
import ListingBanner from "@/components/messages/listing-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

export default function ConversationPage() {
  const { id } = useParams();
  const otherId = parseInt(id);
  const { user } = useAuth();
  const { data: orders = [] } = useQuery<(Order & { items: OrderItemWithProduct[] })[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  const backHref =
    user?.role === "buyer"
      ? "/buyer/messages"
      : user?.role === "seller"
        ? "/seller/messages"
        : "/admin/messages";
  const { data: messages = [], isLoading, sendMessage, markRead } = useConversation(otherId);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScroll = useRef(true);

  const latestOrder = orders.find(o =>
    (user?.role === "buyer" ? o.sellerId === otherId : o.buyerId === otherId)
  );
  const listing = latestOrder?.items?.[0];

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
      <main className="max-w-7xl mx-auto px-4 py-4 flex flex-col h-[calc(100dvh-8rem)] gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <Link href={backHref} className="text-sm text-blue-600 hover:underline self-start">
            ← Back to conversations
          </Link>
          {listing && (
            <ListingBanner
              productId={listing.productId}
              title={listing.productTitle}
              image={listing.productImages[0]}
            />
          )}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 overflow-y-auto space-y-2 p-4 bg-muted">
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                messages.map(m => (
                  <ChatMessage key={m.id} message={m} isOwn={m.senderId === user?.id} />
                ))
              )}
              <div ref={bottomRef} />
            </CardContent>
            <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
              <Input ref={inputRef} placeholder="Type a message" />
              <Button type="submit">Send</Button>
            </form>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
