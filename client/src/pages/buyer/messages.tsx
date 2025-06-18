import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Order } from "@shared/schema";

export default function BuyerMessagesPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="border rounded p-4 flex justify-between items-center bg-white shadow"
              >
                <span>Order #{o.id}</span>
                <Link href={`/orders/${o.id}/messages`}>
                  <Button variant="outline" size="sm">
                    View Messages
                  </Button>
                </Link>
              </div>
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
