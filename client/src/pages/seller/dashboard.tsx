import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Order, Product } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart4,
  CalendarIcon, 
  Package,
  PackagePlus,
  PlusCircle,
  DollarSign,
  PieChart,
  TrendingUp,
  Loader2,
  ListOrdered
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SellerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveTab(hash);
    }
  }, [location]);
  
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });
  
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  
  // Filter products for the current seller
  const sellerProducts = products.filter(product => product.sellerId === user?.id);
  
  // Calculate dashboard stats
  const totalProducts = sellerProducts.length;
  const totalInventory = sellerProducts.reduce((sum, product) => sum + product.availableUnits, 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  
  // Calculate inventory by category
  const inventoryByCategory = sellerProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = 0;
    }
    acc[product.category] += product.availableUnits;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <>
    <Tabs
      defaultValue={activeTab}
      onValueChange={setActiveTab}
      className="space-y-6"
    >
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabsList className="mb-6 grid grid-cols-2 md:flex md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Seller Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.firstName}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/seller/products">
              <Button variant="outline" className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                My Products
              </Button>
            </Link>
            <Link href="/seller/products?action=new">
              <Button className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Products</CardDescription>
                  <CardTitle className="text-3xl">{totalProducts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Package className="h-4 w-4 mr-1 text-primary" />
                    Active listings
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available Inventory</CardDescription>
                  <CardTitle className="text-3xl">{totalInventory}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <PackagePlus className="h-4 w-4 mr-1 text-secondary" />
                    Total units in stock
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Orders</CardDescription>
                  <CardTitle className="text-3xl">{totalOrders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <ListOrdered className="h-4 w-4 mr-1 text-yellow-500" />
                    Received orders
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-3xl">{formatCurrency(totalRevenue)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 flex items-center">
                    <BarChart4 className="h-4 w-4 mr-1 text-green-500" />
                    All time sales
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Product Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Overview</CardTitle>
                <CardDescription>Your current product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sellerProducts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-4 text-left">Product</th>
                            <th className="py-2 px-4 text-right">Price</th>
                            <th className="py-2 px-4 text-right">Available</th>
                            <th className="py-2 px-4 text-right">Total</th>
                            <th className="py-2 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sellerProducts.slice(0, 5).map((product) => (
                            <tr key={product.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-4">
                                <div className="flex items-center">
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.title}
                                    className="h-10 w-10 rounded object-cover mr-3"
                                  />
                                  <div className="truncate max-w-xs">{product.title}</div>
                                </div>
                              </td>
                              <td className="py-2 px-4 text-right">{formatCurrency(product.price)}</td>
                              <td className="py-2 px-4 text-right">{product.availableUnits}</td>
                              <td className="py-2 px-4 text-right">{product.totalUnits}</td>
                              <td className="py-2 px-4 text-right">
                                {product.availableUnits > 0 ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    In Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                    Out of Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-center">
                      <Link href="/seller/products">
                        <Button variant="outline">View All Products</Button>
                      </Link>
                    </div>
                    
                    {/* Category Breakdown */}
                    <div className="border rounded-lg p-4 mt-6">
                      <h3 className="font-medium mb-4">Inventory by Category</h3>
                      <div className="space-y-2">
                        {Object.entries(inventoryByCategory).map(([category, count]) => (
                          <div key={category} className="flex items-center">
                            <div className="w-32 font-medium">{category}</div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${Math.min(100, (count / totalInventory) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="w-16 text-right text-sm">{count} units</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No products listed yet</h3>
                    <p className="text-gray-500 mb-4">Start adding products to your inventory</p>
                    <Link href="/seller/products?action=new">
                      <Button>Add Your First Product</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Orders placed for your products</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-2">
                          <div>
                            <h3 className="font-medium">Order #{order.id}</h3>
                            <p className="text-sm text-gray-500 flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Placed on {formatDate(order.createdAt)}
                            </p>
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
                        
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button variant="outline" size="sm">View Details</Button>
                          
                          {order.status === "ordered" && (
                            <Button size="sm">Process Order</Button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Button variant="outline">View All Orders</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ListOrdered className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
                    <p className="text-gray-500 mb-4">
                      When customers place orders for your products, they'll appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View and process customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
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
                            <p className="text-sm text-gray-500">
                              Customer: Buyer #{order.buyerId}
                            </p>
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
                        
                        {/* Order Status Actions */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="font-medium mb-2">Order Status</h4>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              variant={order.status === "ordered" ? "default" : "outline"}
                              disabled={order.status !== "ordered"}
                            >
                              Mark as Shipped
                            </Button>
                            <Button 
                              size="sm" 
                              variant={order.status === "shipped" ? "default" : "outline"}
                              disabled={order.status !== "shipped"}
                            >
                              Mark as Out for Delivery
                            </Button>
                            <Button 
                              size="sm" 
                              variant={order.status === "out_for_delivery" ? "default" : "outline"}
                              disabled={order.status !== "out_for_delivery"}
                            >
                              Mark as Delivered
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button variant="outline" size="sm">View Details</Button>
                          <Button variant="outline" size="sm">Generate Invoice</Button>
                          <Button variant="outline" size="sm">Contact Buyer</Button>
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
          </TabsContent>
          
          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your seller information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src="https://github.com/shadcn.png" alt={user?.username} />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-xl font-semibold mb-1">{user?.firstName} {user?.lastName}</h3>
                    <p className="text-gray-500 mb-1">{user?.email}</p>
                    <p className="text-primary font-medium mb-4">Verified Seller</p>
                    
                    <Button className="w-full mb-2">Edit Profile</Button>
                    <ChangePasswordDialog>
                      <Button variant="outline" className="w-full">Change Password</Button>
                    </ChangePasswordDialog>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Company Name</h4>
                      <p className="mt-1">{user?.company || "Not specified"}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Contact Email</h4>
                      <p className="mt-1">{user?.email}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Seller Status</h4>
                      <p className="mt-1 flex items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${user?.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} mr-2`}>
                          {user?.isApproved ? "Approved" : "Pending"}
                        </span>
                        {user?.isApproved ? "Your account is fully approved to sell on SY Closeouts" : "Your application is pending review by our team"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Member Since</h4>
                      <p className="mt-1">{user?.createdAt ? formatDate(user.createdAt) : "N/A"}</p>
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Seller Performance</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Order Fulfillment</p>
                          <p className="text-lg font-medium text-green-600">98%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">On-time Shipping</p>
                          <p className="text-lg font-medium text-green-600">95%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Buyer Satisfaction</p>
                          <p className="text-lg font-medium text-green-600">4.8/5</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
