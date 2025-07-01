import { useMemo } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem } from "@shared/schema";
import { formatCurrency, formatDate, SERVICE_FEE_RATE } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

interface OrderWithDetails extends Order {
  items: OrderItemWithProduct[];
}

export default function SellerPayoutPage() {
  const { user } = useAuth();
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const pending = orders.filter(o => o.status === "delivered" && !o.sellerPaid);

  const getPayoutDate = (order: Order) => {
    const base = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
    const payout = new Date(base);
    payout.setDate(payout.getDate() + 7);
    return payout;
  };

  const group = useMemo(() => {
    const map: Record<string, { date: Date; orders: OrderWithDetails[]; total: number }> = {};
    for (const order of pending) {
      const date = getPayoutDate(order);
      const key = date.toDateString();
      if (!map[key]) {
        map[key] = { date, orders: [], total: 0 };
      }
      map[key].orders.push(order);
      map[key].total += order.totalAmount * (1 - SERVICE_FEE_RATE);
    }
    const groups = Object.values(map).sort((a, b) => a.date.getTime() - b.date.getTime());
    return groups[0];
  }, [pending]);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/seller/dashboard">
            <a className="text-primary hover:underline">&larr; Back to Dashboard</a>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payout</CardTitle>
            {group && <CardDescription>{formatDate(group.date)}</CardDescription>}
          </CardHeader>
          <CardContent>
            {group ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-left">Order</th>
                        <th className="py-2 px-4 text-left">Items</th>
                        <th className="py-2 px-4 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.orders.map((o) => (
                        <tr key={o.id} className="border-b align-top">
                          <td className="py-2 px-4 font-medium">#{o.code}</td>
                          <td className="py-2 px-4">
                            <ul className="space-y-1">
                              {o.items.map((i) => (
                                <li key={i.id} className="flex items-center gap-2">
                                  <img src={i.productImages[0]} alt={i.productTitle} className="w-6 h-6 object-cover rounded" />
                                  <span className="truncate">{i.productTitle} x{i.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-2 px-4 text-right">{formatCurrency(o.totalAmount * (1 - SERVICE_FEE_RATE))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-medium">
                  Total: {formatCurrency(group.total)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming payout</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
