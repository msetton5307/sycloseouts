import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PayoutOrder {
  id: number;
  code: string;
  total_amount: number;
}

interface PayoutGroup {
  seller_id: number;
  seller_first_name: string;
  seller_last_name: string;
  seller_email: string;
  payout_date: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  orders: PayoutOrder[];
  total: number;
}

interface WireOrder {
  id: number;
  code: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  total_amount: number;
  created_at: string;
}

interface RecentPayoutOrder {
  id: number;
  code: string;
  payout_date: string;
  total_amount: number;
}

interface RecentPayoutGroup {
  seller_id: number;
  seller_first_name: string;
  seller_last_name: string;
  seller_email: string;
  payouts: RecentPayoutOrder[];
  total: number;
}

interface TopSeller {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  revenue: number;
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading } = useQuery<PayoutGroup[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const { data: wireOrders = [], isLoading: loadingWire } = useQuery<WireOrder[]>({
    queryKey: ["/api/admin/wire-orders"],
  });

  const { data: recentPayouts = [], isLoading: loadingRecent } = useQuery<RecentPayoutGroup[]>({
    queryKey: ["/api/admin/recent-payouts"],
  });

  const { data: topSellers = [], isLoading: loadingTop } = useQuery<TopSeller[]>({
    queryKey: ["/api/admin/top-sellers"],
  });

  const { mutate: payGroup, isPending: isPaying } = useMutation({
    mutationFn: async (g: PayoutGroup) => {
      await Promise.all(
        g.orders.map((o) => apiRequest("POST", `/api/admin/orders/${o.id}/mark-paid`)),
      );
      await apiRequest("POST", "/api/admin/payouts/notify", {
        sellerEmail: g.seller_email,
        orders: g.orders.map(o => ({ code: o.code, total: o.total_amount })),
        bankLast4: g.account_number?.slice(-4) ?? "",
      });
    },
    onSuccess: () => {
      toast({ title: "Marked Paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: markWirePaid, isPending: isWirePaying } = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${id}/mark-wire-paid`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked Paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wire-orders"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: sendReminder, isPending: isReminding } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/orders/${id}/send-wire-reminder`);
    },
    onSuccess: () => {
      toast({ title: "Reminder Sent" });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </a>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Billing Dashboard</CardTitle>
            <CardDescription>Upcoming seller payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groups.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Payout Date</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Bank Info</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={`${g.seller_id}-${g.payout_date}`}>
                        <TableCell>
                          {g.seller_first_name} {g.seller_last_name}
                          <div className="text-xs text-gray-500">{g.seller_email}</div>
                        </TableCell>
                        <TableCell>{formatDate(g.payout_date)}</TableCell>
                        <TableCell>
                          <ul className="space-y-1">
                            {g.orders.map((o) => (
                              <li key={o.id}>#{o.code}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <div>{g.bank_name}</div>
                          <div className="text-xs text-gray-500">{g.account_number}</div>
                          <div className="text-xs text-gray-500">{g.routing_number}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(g.total)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => payGroup(g)} disabled={isPaying}>
                            Mark Paid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                No payouts pending
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Wire Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWire ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : wireOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wireOrders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>#{o.code}</TableCell>
                        <TableCell>
                          {o.buyer_first_name} {o.buyer_last_name}
                          <div className="text-xs text-gray-500">{o.buyer_email}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(o.total_amount))}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => markWirePaid(o.id)} disabled={isWirePaying}>Mark Paid</Button>
                          <Button size="sm" variant="outline" onClick={() => sendReminder(o.id)} disabled={isReminding}>Send Reminder</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No wire orders</div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentPayouts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Payouts</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayouts.map(g => (
                      <TableRow key={g.seller_id}>
                        <TableCell>
                          {g.seller_first_name} {g.seller_last_name}
                          <div className="text-xs text-gray-500">{g.seller_email}</div>
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-1">
                            {g.payouts.map(p => (
                              <li key={p.id}>
                                <span className="mr-2">{formatDate(p.payout_date, true)}</span>
                                #{p.code} - {formatCurrency(p.total_amount)}
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(g.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No payouts recorded</div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : topSellers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSellers.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.first_name} {s.last_name}
                          <div className="text-xs text-gray-500">{s.email}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(s.revenue))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No sales yet</div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
