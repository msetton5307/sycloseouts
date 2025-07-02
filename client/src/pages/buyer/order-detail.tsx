import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Order, OrderItem } from "@shared/schema";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import OrderStatus from "@/components/buyer/order-status";
import { formatCurrency, formatDate, calculateShippingTotal } from "@/lib/utils";

export default function BuyerOrderDetailPage() {
  const { id } = useParams();
  const orderId = parseInt(id);

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadLabel = useMutation({
    mutationFn: (label: string) =>
      apiRequest("POST", `/api/orders/${orderId}/shipping-label`, {
        shippingLabel: label,
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/" + orderId] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        uploadLabel.mutate(event.target.result.toString());
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const { data: order, isLoading } = useQuery<Order & { items: OrderItemWithProduct[] }>({
    queryKey: ["/api/orders/" + orderId],
    enabled: !Number.isNaN(orderId),
  });
  const shippingTotal = order ? calculateShippingTotal(order) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-semibold">Order Not Found</h2>
          <Link href="/buyer/orders">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <Link href="/buyer/orders">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Orders
            </a>
          </Link>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Order #{order.code}
        </h1>
        <p className="text-sm text-gray-500 flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1" /> Placed on {formatDate(order.createdAt)}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <OrderStatus order={order} />

            <div>
              <h3 className="font-medium mb-2">Items</h3>
              <ul className="space-y-2">
                {order.items.map(item => (
                  <li key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.productImages[0]}
                        alt={item.productTitle}
                        className="h-10 w-10 object-cover rounded"
                      />
                      <span>
                        {item.quantity} x {item.productTitle}
                      </span>
                      {item.selectedVariations && (
                        <span className="text-xs text-gray-500 ml-2">
                          {Object.entries(item.selectedVariations)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {shippingTotal > 0 && (
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(shippingTotal)}</span>
              </div>
            )}

            <div className="border-t pt-4 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {order.shippingDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{order.shippingDetails.name}</p>
              <p>{order.shippingDetails.address}</p>
              <p>
                {order.shippingDetails.city}, {order.shippingDetails.state}{" "}
                {order.shippingDetails.zipCode}
              </p>
              <p>{order.shippingDetails.country}</p>
              {order.shippingDetails.phone && <p>{order.shippingDetails.phone}</p>}
              {order.shippingDetails.email && <p>{order.shippingDetails.email}</p>}
            </CardContent>
          </Card>
        )}

        {order.shippingChoice === "buyer" && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Package Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {order.shippingPackage ? (
                  <>
                    <p>
                      Dimensions: {order.shippingPackage.length} x {order.shippingPackage.width} x {order.shippingPackage.height}
                    </p>
                    <p>Weight: {order.shippingPackage.weight}</p>
                    <p>Ship From: {order.shippingPackage.address}</p>
                  </>
                ) : (
                  <p>Waiting for seller to provide shipping info...</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Shipping Label</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.shippingLabel ? (
                  <Button asChild>
                    <a href={order.shippingLabel} download>
                      Download Label
                    </a>
                  </Button>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={!order.shippingPackage}
                    />
                    <Button onClick={triggerUpload} disabled={uploading || !order.shippingPackage}>
                      {uploading ? "Uploading..." : "Upload Label"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {order.status === "awaiting_wire" && (
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/wire-instructions">Wire Instructions</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}