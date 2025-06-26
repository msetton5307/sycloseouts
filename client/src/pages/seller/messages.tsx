import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { Order } from "@shared/schema";
import ConversationPreview from "@/components/messages/conversation-preview";
import { useEffect } from "react";

export default function SellerMessagesPage() {
  const { user } = useAuth();
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  const buyers = Array.from(new Set(orders.map(o => o.buyerId)));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <section>
          <h2 className="text-xl font-semibold mb-2">Conversations</h2>
          {buyers.length > 0 ? (
            <div className="border rounded divide-y bg-white shadow">
              {buyers.map((bid) => (
                <ConversationPreview key={bid} otherId={bid} />
              ))}
            </div>
          ) : (
            <p>No orders yet.</p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}