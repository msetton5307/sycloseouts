import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useProductQuestions, useUnreadMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Order } from "@shared/schema";

export default function SellerMessagesPage() {
  const { user } = useAuth();
  const { data: questions = [], isLoading: qLoading } = useProductQuestions();
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <section>
          <h2 className="text-xl font-semibold mb-2">Product Questions</h2>
          {qLoading ? (
            <p>Loading...</p>
          ) : questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="border rounded p-4 bg-white shadow">
                  <p className="font-medium">Product #{q.productId}</p>
                  <p className="text-gray-700 mb-1">{q.question}</p>
                  <p className="text-xs text-gray-500">Buyer #{q.buyerId}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No questions yet.</p>
          )}
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Order Conversations</h2>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="border rounded p-4 flex justify-between items-center bg-white shadow">
                  <span>Order #{o.id}</span>
                  <Link href={`/orders/${o.id}/messages`}>
                    <Button variant="outline" size="sm">View Messages</Button>
                  </Link>
                </div>
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
