import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Order } from "@shared/schema";

interface OrderWithPreview extends Order {
  previewImage?: string | null;
}
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, calculateSellerPayout } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SendMessageDialog from "@/components/messages/send-message-dialog";
import {
  CalendarIcon,
  Loader2,
  ListOrdered,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

export default function SellerOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<OrderWithPreview[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const [tab, setTab] = useState("seller");

  const sellerOrders = orders.filter((o) => o.shippingChoice === "seller");
  const buyerOrders = orders.filter((o) => o.shippingChoice === "buyer");

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

  const [pkgOrderId, setPkgOrderId] = useState<number | null>(null);
  const [pkg, setPkg] = useState({
    length: "",
    width: "",
    height: "",
    weight: "",
    unit: "lbs",
    street: "",
    city: "",
    state: "",
    zip: "",
  });


  function handleConfirmTracking() {
    if (trackingOrderId && trackingNum) {
      updateOrder.mutate({ id: trackingOrderId, update: { trackingNumber: trackingNum, status: "shipped" } });
    }
    setTrackingOrderId(null);
  }

  function handleMarkAsShipped(id: number) {
    setTrackingOrderId(id);
    setTrackingNum("");
  }

  function handleViewLabelAndShip(id: number) {
    setLabelOrderId(id);
  }

  function handleShipWithLabel() {
    if (labelOrderId) {
      updateOrder.mutate({ id: labelOrderId, update: { status: "shipped" } });
    }
    setLabelOrderId(null);
  }

  function handleOpenPackageDetails(o: Order) {
    const p: any = o.shippingPackage || {};
    let weight = "";
    let unit = "lbs";
    if (typeof p.weight === "string") {
      const parts = p.weight.split(" ");
      weight = parts[0] || "";
      unit = parts[1] || "lbs";
    } else if (p.weight) {
      weight = String(p.weight);
    }
    setPkg({
      length: p.length || "",
      width: p.width || "",
      height: p.height || "",
      weight,
      unit,
      street: p.street || "",
      city: p.city || "",
      state: p.state || "",
      zip: p.zip || "",
    });
    setPkgOrderId(o.id);
  }

  function handleSavePackage() {
    if (!pkgOrderId) return;
    const pkgData = {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      weight: `${pkg.weight} ${pkg.unit}`,
      address: `${pkg.street}, ${pkg.city}, ${pkg.state} ${pkg.zip}`,
      street: pkg.street,
      city: pkg.city,
      state: pkg.state,
      zip: pkg.zip,
    };
    updateOrder.mutate({ id: pkgOrderId, update: { shippingPackage: pkgData } });
    setPkgOrderId(null);
  }


  function handleCancelOrder(id: number) {
    if (window.confirm("Cancel this order?")) {
      cancelOrder.mutate(id);
    }
  }

  const labelOrder = orders.find((o) => o.id === labelOrderId);

  function renderOrders(list: OrderWithPreview[]) {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return list.length > 0 ? (
      <div className="space-y-6">
        {list.map((order) => (
          <div key={order.id} className="border rounded-lg p-4">
            <div className="flex gap-4">
              {order.previewImage && (
                <img
                  src={order.previewImage}
                  alt={`Order ${order.code} item`}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-2 flex-1">
                <div>
                  <h3 className="font-medium">Order #{order.code}</h3>
                  <p className="text-sm text-gray-500 flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    Placed on {formatDate(order.createdAt, true)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Customer: {order.buyerFirstName ? `${order.buyerFirstName} ${order.buyerLastName}` : `Buyer #${order.buyerId}`}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-medium">{formatCurrency(calculateSellerPayout(order))}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      order.status === "delivered"
                        ? "bg-green-100 text-green-800"
                        : order.status === "shipped" || order.status === "out_for_delivery"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Order Status</h4>
              <div className="flex flex-wrap gap-2">
                {order.shippingChoice === "buyer" ? (
                  <Button
                    size="sm"
                    variant={order.status === "ordered" ? "default" : "outline"}
                    disabled={order.status !== "ordered"}
                    onClick={() => handleViewLabelAndShip(order.id)}
                  >
                    View Label &amp; Ship
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={order.status === "ordered" ? "default" : "outline"}
                    disabled={order.status !== "ordered"}
                    onClick={() => handleMarkAsShipped(order.id)}
                  >
                    Mark as Shipped
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => handleOpenPackageDetails(order)}>
                {order.shippingChoice === "buyer" ? (
                  <>
                    Upload Package Details
                    <AlertCircle className="ml-1 h-4 w-4 text-red-500" />
                  </>
                ) : (
                  "Package Details"
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/seller/orders/${order.id}`}>View Details</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCancelOrder(order.id)}>
                Cancel Order
              </Button>
              <SendMessageDialog
                trigger={<Button variant="outline" size="sm">Contact Buyer</Button>}
                onSubmit={(msg) => messageBuyer.mutate({ buyerId: order.buyerId, message: msg })}
                title="Message Buyer"
              />
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
    );
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
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="seller">Fulfilled by Seller</TabsTrigger>
                <TabsTrigger value="buyer">Fulfilled by Buyer</TabsTrigger>
              </TabsList>
              <TabsContent value="seller">{renderOrders(sellerOrders)}</TabsContent>
              <TabsContent value="buyer">{renderOrders(buyerOrders)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <Dialog open={pkgOrderId !== null} onOpenChange={() => setPkgOrderId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Package Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Length"
                value={pkg.length}
                onChange={(e) => setPkg({ ...pkg, length: e.target.value })}
                type="number"
              />
              <Input
                placeholder="Width"
                value={pkg.width}
                onChange={(e) => setPkg({ ...pkg, width: e.target.value })}
                type="number"
              />
              <Input
                placeholder="Height"
                value={pkg.height}
                onChange={(e) => setPkg({ ...pkg, height: e.target.value })}
                type="number"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Weight"
                value={pkg.weight}
                onChange={(e) => setPkg({ ...pkg, weight: e.target.value })}
                type="number"
              />
              <Select value={pkg.unit} onValueChange={(v) => setPkg({ ...pkg, unit: v })}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Street"
                value={pkg.street}
                onChange={(e) => setPkg({ ...pkg, street: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="City"
                  value={pkg.city}
                  onChange={(e) => setPkg({ ...pkg, city: e.target.value })}
                />
                <Input
                  placeholder="State"
                  value={pkg.state}
                  onChange={(e) => setPkg({ ...pkg, state: e.target.value })}
                />
                <Input
                  placeholder="ZIP"
                  value={pkg.zip}
                  onChange={(e) => setPkg({ ...pkg, zip: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePackage}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={labelOrderId !== null} onOpenChange={() => setLabelOrderId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Shipping Label</DialogTitle>
          </DialogHeader>
          {labelOrder?.shippingLabel ? (
            <div className="space-y-4">
              <img src={labelOrder.shippingLabel} alt="Shipping label" className="max-h-96 w-full object-contain" />
              <Button asChild>
                <a href={labelOrder.shippingLabel} download>
                  Download Label
                </a>
              </Button>
              <Button onClick={handleShipWithLabel}>Mark as Shipped</Button>
            </div>
          ) : (
            <p>Awaiting buyer to upload label.</p>
          )}
        </DialogContent>
      </Dialog>
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

    </>
  );
}
