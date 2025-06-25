import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, Order, SellerApplication, Product } from "@shared/schema";
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
import {
  BarChart4,
  Calculator,
  CheckCircle2,
  FileCheck,
  Loader2,
  ShieldCheck,
  User as UserIcon,
  Users,
  LayoutDashboard,
  Package,
  Star,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch all users
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
  });
  
  // Fetch all orders
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && user.role === "admin",
  });
  
  // Fetch all seller applications
  const {
    data: applications = [],
    isLoading: isLoadingApplications,
    error: applicationsError,
  } = useQuery<SellerApplication[]>({
    queryKey: ["/api/seller-applications"],
    enabled: !!user && user.role === "admin",
  });
  
  // Fetch all products
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user && user.role === "admin",
  });
  
  // Calculate dashboard stats
  const totalUsers = users.length;
  const totalBuyers = users.filter(u => u.role === "buyer").length;
  const totalSellers = users.filter(u => u.role === "seller").length;
  const totalAdmins = users.filter(u => u.role === "admin").length;
  
  const pendingApplications = applications.filter(app => app.status === "pending").length;
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const platformFees = totalRevenue * SERVICE_FEE_RATE;

  const isLoading = isLoadingUsers || isLoadingOrders || isLoadingApplications || isLoadingProducts;
  const isError = usersError || ordersError || applicationsError || productsError;
  
  return (
    <>
    <Tabs
      defaultValue={activeTab}
      onValueChange={setActiveTab}
      className="space-y-6"
    >
      <Header
        dashboardTabs={
          <TabsList className="grid grid-cols-3 md:flex md:w-auto">
            <TabsTrigger value="overview">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="sales">
              <BarChart4 className="h-4 w-4 mr-2" />
              Sales
            </TabsTrigger>
          </TabsList>
        }
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Platform overview and management
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin/users">
              <Button variant="outline" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/applications">
              <Button className="flex items-center">
                <FileCheck className="mr-2 h-4 w-4" />
                Seller Applications
                {pendingApplications > 0 && (
                  <span className="ml-2 bg-white text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
                    {pendingApplications}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/admin/billing">
              <Button variant="outline" className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4" />
                Billing
              </Button>
            </Link>
            <Link href="/admin/featured">
              <Button variant="outline" className="flex items-center">
                <Star className="mr-2 h-4 w-4" />
                Featured Products
              </Button>
            </Link>
          </div>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
            {isError ? (
              <div className="flex justify-center py-12 text-red-600">
                Failed to load dashboard data.
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Users</CardDescription>
                      <CardTitle className="text-3xl">{totalUsers}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Users className="h-4 w-4 mr-1 text-primary" />
                        {totalBuyers} buyers, {totalSellers} sellers
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Platform Revenue</CardDescription>
                      <CardTitle className="text-3xl">{formatCurrency(platformFees)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calculator className="h-4 w-4 mr-1 text-green-500" />
                        3.5% commission on {formatCurrency(totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Products Listed</CardDescription>
                      <CardTitle className="text-3xl">{totalProducts}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Package className="h-4 w-4 mr-1 text-secondary" />
                        Active product listings
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Orders</CardDescription>
                      <CardTitle className="text-3xl">{totalOrders}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-1 text-primary" />
                        Processed through platform
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Seller Applications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Seller Applications</CardTitle>
                    <CardDescription>
                      {pendingApplications} application{pendingApplications !== 1 && 's'} awaiting review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {applications.filter(app => app.status === "pending").length > 0 ? (
                      <div className="space-y-4">
                        {applications
                          .filter(app => app.status === "pending")
                          .slice(0, 5)
                          .map((application) => (
                            <div key={application.id} className="flex items-center justify-between border-b pb-4">
                              <div>
                                <p className="font-medium">{application.companyName}</p>
                                <p className="text-sm text-gray-500">
                                  {application.contactEmail} • {application.yearsInBusiness} years in business
                                </p>
                                <p className="text-sm text-gray-500">
                                  Inventory: {application.inventoryType}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        
                        {pendingApplications > 5 && (
                          <div className="flex justify-center pt-2">
                            <Link href="/admin/applications">
                              <Button variant="outline">
                                View All Applications
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <FileCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No pending applications</h3>
                        <p className="text-gray-500">All seller applications have been processed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest orders and transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex justify-between items-center border-b pb-4">
                            <div>
                              <p className="font-medium">Order #{order.id}</p>
                              <p className="text-sm text-gray-500">
                                Buyer #{order.buyerId} • Seller #{order.sellerId}
                              </p>
                              <div className="flex items-center mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
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
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                              <p className="text-xs text-gray-500">
                                Commission: {formatCurrency(order.totalAmount * SERVICE_FEE_RATE)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <BarChart4 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
                        <p className="text-gray-500">Orders will appear here when buyers make purchases</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Overview of platform users</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Buyers</CardDescription>
                          <CardTitle className="text-3xl">{totalBuyers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            Registered buyers on platform
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Sellers</CardDescription>
                          <CardTitle className="text-3xl">{totalSellers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            Approved sellers on platform
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Admin Users</CardDescription>
                          <CardTitle className="text-3xl">{totalAdmins}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            Platform administrators
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-4 text-left">User</th>
                            <th className="py-2 px-4 text-left">Role</th>
                            <th className="py-2 px-4 text-left">Status</th>
                            <th className="py-2 px-4 text-left">Company</th>
                            <th className="py-2 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.slice(0, 10).map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                                    {user.firstName?.charAt(0) || ""}{user.lastName?.charAt(0) || ""}
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === "admin" 
                                    ? "bg-purple-100 text-purple-800" 
                                    : user.role === "seller"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                              </td>
                              <td className="py-2 px-4">
                                {user.role === "seller" ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {user.isApproved ? "Approved" : "Pending"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                {user.company || "-"}
                              </td>
                              <td className="py-2 px-4 text-right">
                                <Button size="sm" variant="outline">View</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {users.length > 10 && (
                        <div className="flex justify-center mt-6">
                          <Link href="/admin/users">
                            <Button variant="outline">
                              View All Users
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Platform revenue and order statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Total Sales</CardDescription>
                          <CardTitle className="text-3xl">{formatCurrency(totalRevenue)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            Cumulative order value
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Platform Revenue</CardDescription>
                          <CardTitle className="text-3xl">{formatCurrency(platformFees)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            3.5% commission on all orders
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Average Order Value</CardDescription>
                          <CardTitle className="text-3xl">
                            {totalOrders > 0 
                              ? formatCurrency(totalRevenue / totalOrders)
                              : formatCurrency(0)
                            }
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            Across {totalOrders} orders
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-medium mb-4">Order Status Breakdown</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-semibold text-yellow-600 mb-1">
                            {orders.filter(o => o.status === "ordered").length}
                          </div>
                          <div className="text-sm text-gray-600">Ordered</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-semibold text-blue-600 mb-1">
                            {orders.filter(o => o.status === "shipped").length}
                          </div>
                          <div className="text-sm text-gray-600">Shipped</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-semibold text-purple-600 mb-1">
                            {orders.filter(o => o.status === "out_for_delivery").length}
                          </div>
                          <div className="text-sm text-gray-600">Out for Delivery</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-semibold text-green-600 mb-1">
                            {orders.filter(o => o.status === "delivered").length}
                          </div>
                          <div className="text-sm text-gray-600">Delivered</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Top Selling Products</h3>
                      {products.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="py-2 px-4 text-left">Product</th>
                                <th className="py-2 px-4 text-left">Seller</th>
                                <th className="py-2 px-4 text-right">Price</th>
                                <th className="py-2 px-4 text-right">Available Units</th>
                                <th className="py-2 px-4 text-right">Total Units</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.slice(0, 5).map((product) => (
                                <tr key={product.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2 px-4">
                                    <div className="flex items-center">
                                      <img 
                                        src={product.images[0]} 
                                        alt={product.title}
                                        className="h-10 w-10 rounded object-cover mr-3"
                                      />
                                      <div>{product.title}</div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4">Seller #{product.sellerId}</td>
                                  <td className="py-2 px-4 text-right">{formatCurrency(product.price)}</td>
                                  <td className="py-2 px-4 text-right">{product.availableUnits}</td>
                                  <td className="py-2 px-4 text-right">{product.totalUnits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No products have been listed yet</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </main>
    </Tabs>
    <Footer />
  </>
  );
}
