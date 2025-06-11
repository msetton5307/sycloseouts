import { useQuery } from "@tanstack/react-query";
import { Order, Product } from "@shared/schema";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import FeaturedProducts from "@/components/home/featured-products";
import Categories from "@/components/home/categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Home as HomeIcon, Package, ListOrdered, BarChart4 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import OrderStatus from "@/components/buyer/order-status";

export default function BuyerHomePage() {
  const { user } = useAuth();

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "ordered").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome back, {user?.firstName}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{totalOrders}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm text-gray-500 flex items-center">
                <ListOrdered className="h-4 w-4 mr-1 text-primary" />
                All time purchases
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardDescription>Pending Orders</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{pendingOrders}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm text-gray-500 flex items-center">
                <Package className="h-4 w-4 mr-1 text-yellow-500" />
                Awaiting fulfillment
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardDescription>Delivered Orders</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{deliveredOrders}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm text-gray-500 flex items-center">
                <HomeIcon className="h-4 w-4 mr-1 text-green-500" />
                Successfully delivered
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardDescription>Total Spent</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{formatCurrency(totalSpent)}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm text-gray-500 flex items-center">
                <BarChart4 className="h-4 w-4 mr-1 text-primary" />
                All time purchases
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest purchases</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoadingOrders ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-4">
                        <div>
                          <h3 className="font-medium">Order #{order.id}</h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Placed on {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
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

                      <OrderStatus order={order} />

                      <div className="mt-4 flex justify-center sm:justify-end">
                        <Link href={`/buyer/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}

                  <div className="text-center">
                    <Link href="/buyer/orders">
                      <Button variant="outline">View All Orders</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
                  <p className="text-gray-500 mb-4">Start shopping to see your orders here.</p>
                  <Link href="/products">
                    <Button>Browse Products</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <FeaturedProducts />
          <Categories />
        </section>
      </main>
      <Footer />
    </>
  );
}
