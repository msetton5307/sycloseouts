import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Order, OrderItem, Product, Address, Offer } from "@shared/schema";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MakeOfferDialog from "@/components/products/make-offer-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { EditProfileDialog } from "@/components/account/edit-profile-dialog";
import SendMessageDialog from "@/components/messages/send-message-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  formatCurrency,
  formatDate,
  SERVICE_FEE_RATE,
  calculateSellerPayout,
} from "@/lib/utils";

interface OrderItemWithProduct extends OrderItem {
  productTitle: string;
  productImages: string[];
}

interface OrderWithDetails extends Order {
  previewImage?: string | null;
  items: OrderItemWithProduct[];
}

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
  
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });


  type OfferWithProduct = Offer & { productTitle: string; productAvailableUnits: number; productImages: string[] };

  const { data: offers = [] } = useQuery<OfferWithProduct[]>({
    queryKey: ["/api/offers"],
    enabled: !!user,
  });

  const pendingOffers = offers.filter((o) => o.status === "pending");

  const recentOffersCard = (
    <Card>
      <CardHeader>
        <CardTitle>Recent Offers</CardTitle>
        <CardDescription>Offers from buyers</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingOffers.length === 0 ? (
          <p className="text-sm text-gray-500">No offers yet.</p>
        ) : (
          <div className="space-y-4">
            {pendingOffers.slice(0, 5).map((o) => (
              <div key={o.id} className="border rounded-lg p-4 flex gap-4 justify-between">
                {o.productImages?.[0] && (
                  <img
                    src={o.productImages[0]}
                    alt={o.productTitle}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{o.productTitle}</p>
                  {o.selectedVariations && (
                    <p className="text-xs text-gray-500">
                      {Object.entries(o.selectedVariations)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </p>
                  )}
                  <p className="text-sm">Qty: {o.quantity}</p>
                  <p className="text-sm">{formatCurrency(o.price)}</p>
                </div>
                <div className="space-x-2 flex items-start">
                  <Button
                    size="sm"
                    onClick={() =>
                      apiRequest("POST", `/api/offers/${o.id}/accept`).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
                        toast({ title: "Offer accepted" });
                      })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      apiRequest("POST", `/api/offers/${o.id}/reject`).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
                        toast({ title: "Offer rejected" });
                      })
                    }
                  >
                    Reject
                  </Button>
                  <MakeOfferDialog
                    onSubmit={(p, q) => counterOffer.mutate({ id: o.id, price: p, quantity: q })}
                    maxQuantity={o.productAvailableUnits}
                    label="Counter"
                    className=""
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-center">
              <Link href="/seller/offers">
                <Button variant="outline">View All Offers</Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const counterOffer = useMutation({
    mutationFn: ({ id, price, quantity }: { id: number; price: number; quantity: number }) =>
      apiRequest("POST", `/api/offers/${id}/counter`, { price, quantity }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Counter offer sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
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
  const [showAllPayouts, setShowAllPayouts] = useState(false);
  const [bankInfo, setBankInfo] = useState<
    | { bankName: string; accountNumber: string; routingNumber: string }
    | null
  >(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sellerBankInfo");
    if (stored) {
      try {
        setBankInfo(JSON.parse(stored));
      } catch {}
    }
  }, []);

  function handleSaveBankInfo() {
    const info = { bankName, accountNumber, routingNumber };
    localStorage.setItem("sellerBankInfo", JSON.stringify(info));
    setBankInfo(info);
    setBankName("");
    setAccountNumber("");
    setRoutingNumber("");
  }

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

  
  // Filter products for the current seller
  const sellerProducts = products.filter(product => product.sellerId === user?.id);
  
  // Calculate dashboard stats
  const totalProducts = sellerProducts.length;
  const totalInventory = sellerProducts.reduce((sum, product) => sum + product.availableUnits, 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + calculateSellerPayout(order), 0);

  const pendingPayouts = orders.filter(
    o => !o.sellerPaid && o.status !== "cancelled",
  );
  const pendingBalance = pendingPayouts.reduce(
    (sum, o) => sum + calculateSellerPayout(o),
    0,
  );

  const getPayoutDate = (order: Order) => {
    const base = order.deliveredAt
      ? new Date(order.deliveredAt)
      : order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate)
      : new Date(order.createdAt);
    const payout = new Date(base);
    payout.setDate(payout.getDate() + 7);
    return payout;
  };

  const payoutGroups = useMemo(() => {
    const map: Record<string, { date: Date; orders: OrderWithDetails[]; total: number }> = {};
    for (const order of pendingPayouts) {
      const date = getPayoutDate(order);
      const key = date.toDateString();
      if (!map[key]) {
        map[key] = { date, orders: [], total: 0 };
      }
      map[key].orders.push(order);
      map[key].total += calculateSellerPayout(order);
    }
    return Object.values(map).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [pendingPayouts]);
  
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <Header
        onProfileClick={() => {
          setActiveTab("profile");
          window.location.hash = "profile";
        }}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Seller Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.firstName}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:space-x-4 gap-2">
            <Link href="/seller/products">
              <Button variant="outline" className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                My Products
              </Button>
            </Link>
            <Link href="/seller/orders">
              <Button variant="outline" className="flex items-center">
                <ListOrdered className="mr-2 h-4 w-4" />
                Orders
              </Button>
            </Link>
            <Link href="/seller/offers">
              <Button variant="outline" className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4" />
                Offers
              </Button>
            </Link>
            <Link href="/seller/analytics">
              <Button variant="outline" className="flex items-center">
                <BarChart4 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/seller/payouts">
              <Button variant="outline" className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Payouts
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
            {pendingOffers.length > 0 && recentOffersCard}
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

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payouts</CardTitle>
                <CardDescription>
                  Balance: {formatCurrency(pendingBalance)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutGroups.length > 0 ? (
                  <>
                    <Accordion type="multiple" className="w-full">
                      {(showAllPayouts ? payoutGroups : payoutGroups.slice(0, 3)).map((group) => (
                        <AccordionItem key={group.date.toISOString()} value={group.date.toISOString()}>
                          <AccordionTrigger className="px-4">
                            <div className="flex justify-between w-full">
                              <span>{formatDate(group.date)}</span>
                              <span className="font-medium">{formatCurrency(group.total)}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="py-2 px-4 text-left">Order</th>
                                    <th className="py-2 px-4 text-left">Items</th>
                                    <th className="py-2 px-4 text-left">Status</th>
                                    <th className="py-2 px-4 text-right">Payout</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.orders.map((order) => (
                                    <tr key={order.id} className="border-b align-top">
                                      <td className="py-2 px-4 font-medium">#{order.code}</td>
                                      <td className="py-2 px-4">
                                        <ul className="space-y-1">
                                          {order.items.map((item) => (
                                            <li key={item.id} className="flex items-center gap-2">
                                              <img
                                                src={item.productImages[0]}
                                                alt={item.productTitle}
                                                className="w-6 h-6 object-cover rounded"
                                              />
                                              <span className="truncate">
                                                {item.productTitle} x{item.quantity}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </td>
                                      <td className="py-2 px-4">{order.status}</td>
                                      <td className="py-2 px-4 text-right">{formatCurrency(calculateSellerPayout(order))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    {payoutGroups.length > 3 && (
                      <div className="text-center mt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAllPayouts(!showAllPayouts)}>
                          {showAllPayouts ? "Show Less" : "View All"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No upcoming payouts</p>
                )}
              </CardContent>
            </Card>
            
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
                    <div className="hidden md:block overflow-x-auto">
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

                    <div className="space-y-4 md:hidden">
                      {sellerProducts.slice(0, 5).map((product) => (
                        <div key={product.id} className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                            <div>
                              <p className="font-medium truncate w-36">{product.title}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(product.price)}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm space-y-1">
                            <p>
                              {product.availableUnits} / {product.totalUnits}
                            </p>
                            {product.availableUnits > 0 ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">In Stock</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      ))}
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
                            <h3 className="font-medium">Order #{order.code}</h3>
                            <p className="text-sm text-gray-500 flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Placed on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-medium">{formatCurrency(calculateSellerPayout(order))}</p>
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
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/seller/orders/${order.id}`}>View Details</Link>
                          </Button>

                          {order.status === "ordered" && (
                            <Button size="sm" onClick={() => handleMarkAsShipped(order.id)}>
                              Process Order
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleCancelOrder(order.id)}>
                            Cancel
                          </Button>
                          <SendMessageDialog
                            trigger={<Button variant="outline" size="sm">Contact Buyer</Button>}
                            onSubmit={(msg) =>
                              messageBuyer.mutate({ buyerId: order.buyerId, message: msg })
                            }
                            title="Message Buyer"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center">
                      <Link href="/seller/orders">
                        <Button variant="outline">View All Orders</Button>
                      </Link>
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

            {/* Recent Offers */}
            {pendingOffers.length === 0 && recentOffersCard}
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
                      <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-xl font-semibold mb-1">{user?.firstName} {user?.lastName}</h3>
                    <p className="text-gray-500 mb-1">{user?.email}</p>
                    <p className="text-primary font-medium mb-4">Verified Seller</p>
                    
                    <EditProfileDialog>
                      <Button className="w-full mb-2">Edit Profile</Button>
                    </EditProfileDialog>
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

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Payout Method</CardTitle>
                  <CardDescription>
                    Direct deposit information. Payouts are processed weekly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bankInfo ? (
                    <div className="space-y-2">
                      <p>
                        Bank: <span className="font-medium">{bankInfo.bankName}</span>
                      </p>
                      <p>
                        Account ending in {bankInfo.accountNumber.slice(-4)}
                      </p>
                      <Button variant="outline" onClick={() => setBankInfo(null)}>
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        placeholder="Bank Name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                      <Input
                        placeholder="Account Number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                      <Input
                        placeholder="Routing Number"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                      />
                      <Button onClick={handleSaveBankInfo}>Save</Button>
                    </div>
                  )}
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
                          <RadioGroupItem value={String(addr.id)} id={`seller-addr-${addr.id}`} />
                          <label htmlFor={`seller-addr-${addr.id}`} className="text-sm leading-none cursor-pointer">
                            {addr.name} - {addr.address}, {addr.city}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button variant="outline" className="mt-4">Add New Address</Button>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </main>
        </Tabs>
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

      </>
  );
}