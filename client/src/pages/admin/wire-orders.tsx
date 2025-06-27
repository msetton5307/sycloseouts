import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WireOrder {
  id: number;
  code: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  total_amount: number;
  created_at: string;
}

export default function AdminWireOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<WireOrder[]>({
    queryKey: ["/api/admin/wire-orders"],
  });

  const { mutate: markPaid, isPending: isPaying } = useMutation({
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
            <CardTitle>Wire Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : orders.length > 0 ? (
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
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>#{o.code}</TableCell>
                        <TableCell>
                          {o.buyer_first_name} {o.buyer_last_name}
                          <div className="text-xs text-gray-500">{o.buyer_email}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(o.total_amount))}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => markPaid(o.id)} disabled={isPaying}>Mark Paid</Button>
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
      </main>
      <Footer />
    </>
  );
}
