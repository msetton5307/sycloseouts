import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Order, Product, Address, PaymentMethod } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CalendarIcon,
  Package,
  Truck,
  Home,
  ShoppingBag,
  ShoppingCart,
  BarChart4,
  PieChart,
  ListOrdered,
  UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import OrderStatus from "@/components/buyer/order-status";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveTab(hash);
    }
  }, [location]);

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: recentProducts = [], isLoading: isLoadingProducts } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
    enabled: !!user,
  });

  // Calculate dashboard stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (order) => order.status === "ordered",
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  ).length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <Header onProfileClick={() => setActiveTab("profile")}/> 
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                Buyer Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Welcome back, {user?.firstName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/products">
                <Button className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Shop Products
                </Button>
              </Link>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Orders</CardDescription>
                  <CardTitle className="text-3xl">{totalOrders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <ListOrdered className="h-4 w-4 mr-1 text-primary" />
                    All time purchases
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Orders</CardDescription>
                  <CardTitle className="text-3xl">{pendingOrders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Package className="h-4 w-4 mr-1 text-yellow-500" />
                    Awaiting fulfillment
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Delivered Orders</CardDescription>
                  <CardTitle className="text-3xl">{deliveredOrders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Home className="h-4 w-4 mr-1 text-green-500" />
                    Successfully delivered
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Spent</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatCurrency(totalSpent)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <BarChart4 className="h-4 w-4 mr-1 text-primary" />
                    All time purchases
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest purchases</CardDescription>
              </CardHeader>
              <CardContent>
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
                  <div className="space-y-6">
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
                            <p className="font-medium">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                order.status === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : order.status === "shipped" ||
                                      order.status === "out_for_delivery"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1).replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <OrderStatus order={order} />

                        <div className="mt-4 flex justify-end">
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
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No orders yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start shopping to see your orders here.
                    </p>
                    <Link href="/products">
                      <Button>Browse Products</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended for You</CardTitle>
                <CardDescription>
                  Based on your purchase history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recentProducts.slice(0, 3).map((product) => (
                      <Link key={product.id} href={`/products/${product.id}`}>
                        <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="h-40 w-full object-cover"
                          />
                          <div className="p-4">
                            <h3 className="font-medium truncate">
                              {product.title}
                            </h3>
                            <p className="text-primary font-semibold mt-1">
                              {formatCurrency(product.price)}/unit
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">
                      No product recommendations available.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage
                        src="https://github.com/shadcn.png"
                        alt={user?.username}
                      />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.charAt(0)}
                        {user?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="text-xl font-semibold mb-1">
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <p className="text-gray-500 mb-4">{user?.email}</p>

                    <Button className="w-full mb-2">Edit Profile</Button>
                    <ChangePasswordDialog>
                      <Button variant="outline" className="w-full">
                        Change Password
                      </Button>
                    </ChangePasswordDialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Username
                      </h4>
                      <p className="mt-1">{user?.username}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Email Address
                      </h4>
                      <p className="mt-1">{user?.email}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Company
                      </h4>
                      <p className="mt-1">{user?.company || "Not specified"}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Account Type
                      </h4>
                      <p className="mt-1 capitalize">{user?.role}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Member Since
                      </h4>
                      <p className="mt-1">
                        {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Saved Addresses</CardTitle>
                </CardHeader>
                <CardContent>
                  {addresses.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved addresses</p>
                  ) : (
                    <RadioGroup className="space-y-4">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="flex items-start space-x-2 border rounded-md p-4">
                          <RadioGroupItem value={String(addr.id)} id={`addr-${addr.id}`} />
                          <label htmlFor={`addr-${addr.id}`} className="text-sm leading-none cursor-pointer">
                            {addr.name} - {addr.address}, {addr.city}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button variant="outline" className="mt-4">Add New Address</Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Saved Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved payment methods</p>
                  ) : (
                    <RadioGroup className="space-y-4">
                      {paymentMethods.map((pm) => (
                        <div key={pm.id} className="flex items-start space-x-2 border rounded-md p-4">
                          <RadioGroupItem value={String(pm.id)} id={`pm-${pm.id}`} />
                          <label htmlFor={`pm-${pm.id}`} className="text-sm leading-none cursor-pointer">
                            {pm.brand} ending in {pm.cardLast4}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button variant="outline" className="mt-4">Add New Payment Method</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </main>
      </Tabs>
      <Footer />
    </>
  );
}