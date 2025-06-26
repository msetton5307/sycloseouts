import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { Order } from "@shared/schema";
import ConversationPreview from "@/components/messages/conversation-preview";
import { useEffect } from "react";

export default function BuyerMessagesPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const sellers = Array.from(new Set(orders.map(o => o.sellerId)));

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : sellers.length > 0 ? (
          <div className="border rounded divide-y bg-white shadow">
            {sellers.map((sid) => (
              <ConversationPreview key={sid} otherId={sid} />
            ))}
          </div>
        ) : (
          <p>No orders yet.</p>
        )}
      </main>
      <Footer />
    </>
  );
}