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
  orders: PayoutOrder[];
  total: number;
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading } = useQuery<PayoutGroup[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const { mutate: payGroup, isPending: isPaying } = useMutation({
    mutationFn: async (g: PayoutGroup) => {
      await Promise.all(
        g.orders.map((o) => apiRequest("POST", `/api/admin/orders/${o.id}/mark-paid`)),
      );
    },
    onSuccess: () => {
      toast({ title: "Marked Paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
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
            <CardTitle>Billing</CardTitle>
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
      </main>
      <Footer />
    </>
  );
}
