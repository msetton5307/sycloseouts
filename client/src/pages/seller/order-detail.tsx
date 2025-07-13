import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Order, OrderItem } from "@shared/schema";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import OrderStatus from "@/components/buyer/order-status";
import {
  formatCurrency,
  formatDate,
  subtractServiceFee,
  calculateSellerPayout,
  calculateShippingTotal,
} from "@/lib/utils";

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const orderId = parseInt(id);

  const { data: order, isLoading } = useQuery<Order & { items: OrderItemWithProduct[] }>({
    queryKey: ["/api/orders/" + orderId],
    enabled: !Number.isNaN(orderId),
  });
  const shippingTotal = order ? calculateShippingTotal(order) : 0;

  const queryClient = useQueryClient();
  const updateOrder = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", `/api/orders/${orderId}` , data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/" + orderId] });
    },
  });

  const [pkg, setPkg] = useState({ length: "", width: "", height: "", weight: "", address: "" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">Loading...</div>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-semibold">Order Not Found</h2>
          <Link href="/seller/orders">
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
          <Link href="/seller/orders">
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
        <p className="text-sm text-gray-500">Buyer #{order.buyerId}</p>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <OrderStatus order={order} />

            <div>
              <h3 className="font-medium mb-2">Items</h3>
              <ul className="space-y-4">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.productImages[0]}
                        alt={item.productTitle}
                        className="h-14 w-14 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{item.productTitle}</p>
                        {item.selectedVariations && (
                          <p className="text-xs text-gray-500">
                            {Object.entries(item.selectedVariations)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm space-y-1">
                      <p>Qty: {item.quantity}</p>
                      <p>{formatCurrency(subtractServiceFee(item.unitPrice))} each</p>
                      <p className="font-medium">
                        {formatCurrency(subtractServiceFee(item.totalPrice))}
                      </p>
                    </div>
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
              <span>{formatCurrency(calculateSellerPayout(order))}</span>
            </div>
          </CardContent>
        </Card>

        {order.shippingDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              {order.shippingChoice === "seller" ? (
                <>
                  <p className="font-medium">{order.shippingDetails.name}</p>
                  <p>{order.shippingDetails.address}</p>
                  <p>
                    {order.shippingDetails.city}, {order.shippingDetails.state}{" "}
                    {order.shippingDetails.zipCode}
                  </p>
                  <p>{order.shippingDetails.country}</p>
                </>
              ) : (
                <>Buyer contact information is hidden for privacy.</>
              )}
            </CardContent>
          </Card>
        )}

        {order.shippingChoice === "buyer" && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Package Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.shippingPackage ? (
                  <div className="space-y-1 text-sm">
                    <p>Dimensions: {order.shippingPackage.length} x {order.shippingPackage.width} x {order.shippingPackage.height}</p>
                    <p>Weight: {order.shippingPackage.weight}</p>
                    <p>Ship From: {order.shippingPackage.address}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Length"
                        value={pkg.length}
                        onChange={(e) => setPkg({ ...pkg, length: e.target.value })}
                      />
                      <Input
                        placeholder="Width"
                        value={pkg.width}
                        onChange={(e) => setPkg({ ...pkg, width: e.target.value })}
                      />
                      <Input
                        placeholder="Height"
                        value={pkg.height}
                        onChange={(e) => setPkg({ ...pkg, height: e.target.value })}
                      />
                      <Input
                        placeholder="Weight"
                        value={pkg.weight}
                        onChange={(e) => setPkg({ ...pkg, weight: e.target.value })}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Ship from address"
                        value={pkg.address}
                        onChange={(e) => setPkg({ ...pkg, address: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => updateOrder.mutate({ shippingPackage: pkg })}
                      disabled={updateOrder.isPending}
                    >
                      {updateOrder.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Label</CardTitle>
              </CardHeader>
              <CardContent>
                {order.shippingLabel ? (
                  <Button asChild>
                    <a href={order.shippingLabel} download>
                      Download Label
                    </a>
                  </Button>
                ) : (
                  <p>Awaiting buyer to upload label</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}