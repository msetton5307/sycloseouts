import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Order, Product } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SummaryRow {
  date: string;
  orders: number;
  revenue: number;
}

interface BestSeller {
  productId: number;
  title: string;
  unitsSold: number;
  revenue: number;
}

interface PayoutSummary {
  paid: number;
  pending: number;
}

export default function SellerAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);

  const start = new Date(Date.now() - range * 86400000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date().toISOString().slice(0, 10);

  const { data: rows = [] } = useQuery<SummaryRow[]>({
    queryKey: [`/api/seller/sales?start=${startStr}&end=${endStr}`],
    enabled: !!user,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: best = [] } = useQuery<BestSeller[]>({
    queryKey: [`/api/seller/best-sellers?start=${startStr}&end=${endStr}`],
    enabled: !!user,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [`/api/products?sellerId=${user?.id ?? ""}`],
    enabled: !!user,
  });

  const { data: payout = { paid: 0, pending: 0 } } = useQuery<PayoutSummary>({
    queryKey: [`/api/seller/payout-summary?start=${startStr}&end=${endStr}`],
    enabled: !!user,
  });

  const total = rows.reduce((sum, r) => sum + r.revenue, 0);

  const ordersByDay = Object.entries(
    orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const d = (o.createdAt as string).slice(0, 10);
      if (!acc[d]) acc[d] = { count: 0, revenue: 0 };
      acc[d].count++;
      acc[d].revenue += o.totalAmount;
      return acc;
    }, {}),
  )
    .map(([date, val]) => ({ date, ...val }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <a
            href={`/api/seller/sales.pdf?start=${startStr}&end=${endStr}`}
            className="inline-flex"
          >
            <Button>Export PDF</Button>
          </a>
        </div>
        <div>
          <label className="mr-2 text-sm">Range:</label>
          <select
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value))}
            className="border rounded p-1"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
            <CardDescription>{formatCurrency(total)} total</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-right">Orders</th>
                  <th className="py-2 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{formatDate(row.date)}</td>
                    <td className="py-2 px-4 text-right">{row.orders}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Pending: {formatCurrency(payout.pending)}</p>
            <p>Paid Out: {formatCurrency(payout.paid)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-right">Orders</th>
                  <th className="py-2 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ordersByDay.map((r) => (
                  <tr key={r.date} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{formatDate(r.date)}</td>
                    <td className="py-2 px-4 text-right">{r.count}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Product</th>
                  <th className="py-2 px-4 text-right">Units</th>
                  <th className="py-2 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {best.map((b) => (
                  <tr key={b.productId} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{b.title}</td>
                    <td className="py-2 px-4 text-right">{b.unitsSold}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Product</th>
                  <th className="py-2 px-4 text-right">Available</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{p.title}</td>
                    <td className="py-2 px-4 text-right">{p.availableUnits}</td>
                    <td className="py-2 px-4 text-right">{p.totalUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
