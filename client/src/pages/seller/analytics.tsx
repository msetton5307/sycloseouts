import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SummaryRow {
  date: string;
  revenue: number;
}

export default function SellerAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);

  const start = new Date(Date.now() - range * 86400000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date().toISOString().slice(0, 10);

  const { data: rows = [] } = useQuery<SummaryRow[]>({
    queryKey: ["/api/seller/sales", startStr, endStr],
    enabled: !!user,
  });

  const total = rows.reduce((sum, r) => sum + r.revenue, 0);

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
                  <th className="py-2 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{formatDate(row.date)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(row.revenue)}</td>
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
