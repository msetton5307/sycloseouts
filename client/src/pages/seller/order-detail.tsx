import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderItem } from "@shared/schema";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import OrderStatus from "@/components/buyer/order-status";
import { formatCurrency, formatDate, removeServiceFee } from "@/lib/utils";

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const orderId = parseInt(id);

  const { data: order, isLoading } = useQuery<Order & { items: OrderItemWithProduct[] }>({
    queryKey: ["/api/orders/" + orderId],
    enabled: !Number.isNaN(orderId),
  });

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
                      <p>{formatCurrency(removeServiceFee(item.unitPrice))} each</p>
                      <p className="font-medium">
                        {formatCurrency(removeServiceFee(item.totalPrice))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(removeServiceFee(order.totalAmount))}</span>
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
                  {order.shippingDetails.phone && <p>{order.shippingDetails.phone}</p>}
                  {order.shippingDetails.email && <p>{order.shippingDetails.email}</p>}
                </>
              ) : (
                <>Buyer contact information is hidden for privacy.</>
              )}
            </CardContent>
          </Card>
        )}

        {order.shippingChoice === "buyer" && (
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
                <p>No label uploaded</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}