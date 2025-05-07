import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  CalendarIcon, 
  Search, 
  ShoppingBag,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import OrderStatus from "@/components/buyer/order-status";

export default function BuyerOrdersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });
  
  // Filter orders based on status and search term
  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (filter !== "all" && order.status !== filter) {
      return false;
    }
    
    // Filter by search term (order ID)
    if (searchTerm && !order.id.toString().includes(searchTerm)) {
      return false;
    }
    
    return true;
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/buyer/dashboard">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </a>
          </Link>
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">
          My Orders
        </h1>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View and track all your orders</CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order #"
                    className="pl-10 min-w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-6">
                {filteredOrders.map((order) => (
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
                    
                    <OrderStatus order={order} />
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/buyer/orders/${order.id}`}>View Details</Link>
                      </Button>
                      
                      {order.trackingNumber && (
                        <Button variant="outline" size="sm">
                          Track Package
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm">
                        Download Invoice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                {searchTerm || filter !== "all" ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No matching orders found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your filters</p>
                    <Button variant="outline" onClick={() => {
                      setSearchTerm("");
                      setFilter("all");
                    }}>
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
                    <p className="text-gray-500 mb-4">Start shopping to see your orders here.</p>
                    <Link href="/products">
                      <Button>Browse Products</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
