import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { Order } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      apiRequest("PUT", `/api/orders/${data.id}`, { status: data.status }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Order updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: cancelOrder } = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/orders/${id}/cancel`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Order cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
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
            <CardTitle>All Orders</CardTitle>
            <CardDescription>Manage every order on the platform</CardDescription>
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
                      <TableHead>Seller</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wire Time Left</TableHead>
                      <TableHead>Shipping</TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">
                            #{o.code}
                          </Link>
                          <div className="text-xs text-gray-500">{formatDate(o.createdAt)}</div>
                        </TableCell>
                        <TableCell>#{o.buyerId}</TableCell>
                        <TableCell>#{o.sellerId}</TableCell>
                      <TableCell>
                          <Select value={o.status} onValueChange={s => updateStatus({ id: o.id, status: s })}>
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="awaiting_wire">Awaiting Wire</SelectItem>
                              <SelectItem value="ordered">Ordered</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {o.status === "awaiting_wire"
                            ? (() => {
                                const expires = new Date(o.createdAt).getTime() + 48 * 60 * 60 * 1000;
                                return expires > Date.now()
                                  ? `${formatDistanceToNowStrict(expires)} left`
                                  : "Expired";
                              })()
                            : "-"}
                        </TableCell>
                        <TableCell>{o.shippingChoice || "-"}</TableCell>
                        <TableCell>{o.trackingNumber || "-"}</TableCell>
                        <TableCell>
                          {o.shippingLabel ? (
                            <a href={o.shippingLabel} download className="text-primary underline">
                              Download
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(o.totalAmount)}</TableCell>
                        <TableCell>
                          {o.status === "awaiting_wire" && (
                            <Button size="sm" variant="outline" onClick={() => cancelOrder(o.id)}>
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No orders found</div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
