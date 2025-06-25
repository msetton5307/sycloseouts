import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BillingOrder {
  id: number;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  seller_first_name: string;
  seller_last_name: string;
  seller_email: string;
  total_amount: number; // field names returned from pg
  status: string;
  buyer_charged: boolean;
  seller_paid: boolean;
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<BillingOrder[]>({
    queryKey: ["/api/admin/billing"],
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(orders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id),
    );
  };

  const { mutate: markCharged, isPending: isCharging } = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${id}/mark-charged`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked Charged" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: markPaid, isPending: isPaying } = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${id}/mark-paid`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked Paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: bulkCharge, isPending: isBulkCharging } = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map((id) =>
          apiRequest("POST", `/api/admin/orders/${id}/mark-charged`)
        ),
      );
    },
    onSuccess: () => {
      toast({ title: "Marked Charged" });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
    },
    onError: (err: any) => {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: bulkPay, isPending: isBulkPaying } = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map((id) => apiRequest("POST", `/api/admin/orders/${id}/mark-paid`)),
      );
    },
    onSuccess: () => {
      toast({ title: "Marked Paid" });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
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
            <CardDescription>Manual charges and payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              ) : orders.length > 0 ? (
                <>
                <div className="mb-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => bulkCharge(selectedIds)}
                    disabled={selectedIds.length === 0 || isBulkCharging}
                  >
                    Mark Charged
                  </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkPay(selectedIds)}
                  disabled={selectedIds.length === 0 || isBulkPaying}
                >
                  Pay Sellers
                </Button>
                </div>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={selectedIds.length === orders.length && orders.length > 0}
                          onCheckedChange={(checked: boolean) => toggleAll(checked)}
                        />
                      </TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Seller Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(o.id)}
                            onCheckedChange={(checked: boolean) => toggleOne(o.id, checked)}
                          />
                        </TableCell>
                        <TableCell>#{o.id}</TableCell>
                        <TableCell>
                          {o.buyer_first_name} {o.buyer_last_name}
                          <div className="text-xs text-gray-500">{o.buyer_email}</div>
                        </TableCell>
                        <TableCell>
                          {o.seller_first_name} {o.seller_last_name}
                          <div className="text-xs text-gray-500">{o.seller_email}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(o.total_amount))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(o.total_amount) * SERVICE_FEE_RATE)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(o.total_amount) * (1 - SERVICE_FEE_RATE))}</TableCell>
                        <TableCell>{o.status}</TableCell>
                        <TableCell className="space-x-2">
                          {!o.buyer_charged && (
                            <Button size="sm" onClick={() => markCharged(o.id)} disabled={isCharging}>Charge</Button>
                          )}
                          {o.status === "delivered" && !o.seller_paid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPaid(o.id)}
                              disabled={isPaying}
                            >
                              Pay Seller
                            </Button>
                          )}
                          <Button variant="link" size="sm" asChild>
                            <Link href={`/admin/orders/${o.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                </>
              ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                No billing data
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

