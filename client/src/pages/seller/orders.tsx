import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Order } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CalendarIcon,
  Loader2,
  ListOrdered,
  ArrowLeft,
} from "lucide-react";

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, update }: { id: number; update: Partial<Order> }) =>
      apiRequest("PUT", `/api/orders/${id}`, update).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/orders/${id}/cancel`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    },
  });

  const messageBuyer = useMutation({
    mutationFn: ({ buyerId, message }: { buyerId: number; message: string }) =>
      apiRequest("POST", `/api/conversations/${buyerId}/messages`, { message }),
    onSuccess: () => toast({ title: "Message sent" }),
    onError: (err: Error) =>
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" }),
  });

  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [trackingNum, setTrackingNum] = useState("");

  const [labelOrderId, setLabelOrderId] = useState<number | null>(null);
  const [pkgWeight, setPkgWeight] = useState("");
  const [pkgLength, setPkgLength] = useState("");
  const [pkgWidth, setPkgWidth] = useState("");
  const [pkgHeight, setPkgHeight] = useState("");
  const [rates, setRates] = useState<any[]>([]);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  function handleConfirmTracking() {
    if (trackingOrderId && trackingNum) {
      updateOrder.mutate({ id: trackingOrderId, update: { trackingNumber: trackingNum } });
    }
    setTrackingOrderId(null);
  }

  function handleMarkAsShipped(id: number) {
    setTrackingOrderId(id);
    setTrackingNum("");
  }

  function handleMarkOutForDelivery(id: number) {
    updateOrder.mutate({ id, update: { status: "out_for_delivery" } });
  }

  function handleMarkDelivered(id: number) {
    updateOrder.mutate({ id, update: { status: "delivered" } });
  }

  function handleCancelOrder(id: number) {
    if (window.confirm("Cancel this order?")) {
      cancelOrder.mutate(id);
    }
  }

  function handleContactBuyer(buyerId: number) {
    const msg = window.prompt("Message to buyer");
    if (!msg) return;
    messageBuyer.mutate({ buyerId, message: msg });
  }

  function handleBuyLabel(id: number) {
    setLabelOrderId(id);
    setPkgWeight("");
    setPkgLength("");
    setPkgWidth("");
    setPkgHeight("");
    setRates([]);
    setLabelUrl(null);
  }

  async function fetchRates() {
    if (!labelOrderId) return;
    setLoadingRates(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/orders/${labelOrderId}/shipping/rates`,
        {
          weight: parseFloat(pkgWeight),
          length: parseFloat(pkgLength),
          width: parseFloat(pkgWidth),
          height: parseFloat(pkgHeight),
        },
      );
      const data = await res.json();
      setRates(data.rates || []);
    } catch (err: any) {
      toast({ title: "Failed to get rates", description: err.message, variant: "destructive" });
    } finally {
      setLoadingRates(false);
    }
  }

  async function purchaseLabel(rateId: string) {
    if (!labelOrderId) return;
    try {
      const res = await apiRequest(
        "POST",
        `/api/orders/${labelOrderId}/shipping/purchase`,
        { rateObjectId: rateId },
      );
      const data = await res.json();
      setLabelUrl(data.labelUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/seller/dashboard" className="text-primary hover:underline flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">Orders</h1>

        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>View and process customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-2">
                      <div>
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Placed on {formatDate(order.createdAt)}
                        </p>
                        <p className="text-sm text-gray-500">Customer: Buyer #{order.buyerId}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.status === "shipped" || order.status === "out_for_delivery"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">Order Status</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={order.status === "ordered" ? "default" : "outline"}
                          disabled={order.status !== "ordered"}
                          onClick={() => handleMarkAsShipped(order.id)}
                        >
                          Mark as Shipped
                        </Button>
                        <Button
                          size="sm"
                          variant={order.status === "shipped" ? "default" : "outline"}
                          disabled={order.status !== "shipped"}
                          onClick={() => handleMarkOutForDelivery(order.id)}
                        >
                          Mark as Out for Delivery
                        </Button>
                        <Button
                          size="sm"
                          variant={order.status === "out_for_delivery" ? "default" : "outline"}
                          disabled={order.status !== "out_for_delivery"}
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          Mark as Delivered
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/seller/orders/${order.id}`}>View Details</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancelOrder(order.id)}>
                        Cancel Order
                      </Button>
                      {!order.shippingDetails?.labelUrl && (
                        <Button variant="outline" size="sm" onClick={() => handleBuyLabel(order.id)}>
                          Buy Shipping Label
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleContactBuyer(order.buyerId)}>
                        Contact Buyer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ListOrdered className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
                <p className="text-gray-500">
                  When customers place orders for your products, they'll appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      <Dialog open={trackingOrderId !== null} onOpenChange={() => setTrackingOrderId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enter Tracking Number</DialogTitle>
            <DialogDescription>Provide the shipment tracking number.</DialogDescription>
          </DialogHeader>
          <Input value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)} placeholder="Tracking number" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmTracking} disabled={!trackingNum}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={labelOrderId !== null} onOpenChange={() => setLabelOrderId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Buy Shipping Label</DialogTitle>
          </DialogHeader>
          {labelUrl ? (
            <div className="space-y-4">
              <p className="text-sm">Label purchased.</p>
              <a href={labelUrl} target="_blank" className="text-primary underline">Download Label</a>
            </div>
          ) : rates.length > 0 ? (
            <div className="space-y-2">
              {rates.map((r) => (
                <Button key={r.object_id} className="w-full" onClick={() => purchaseLabel(r.object_id)}>
                  {r.provider} {r.servicelevel} - {formatCurrency(r.amount)}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Input value={pkgWeight} onChange={(e) => setPkgWeight(e.target.value)} placeholder="Weight (oz)" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={pkgLength} onChange={(e) => setPkgLength(e.target.value)} placeholder="L" />
                <Input value={pkgWidth} onChange={(e) => setPkgWidth(e.target.value)} placeholder="W" />
                <Input value={pkgHeight} onChange={(e) => setPkgHeight(e.target.value)} placeholder="H" />
              </div>
              <Button onClick={fetchRates} disabled={loadingRates}>Get Rates</Button>
              <p className="text-xs text-red-600 mt-2">
                Entering incorrect package details may result in additional fees and account suspension.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
