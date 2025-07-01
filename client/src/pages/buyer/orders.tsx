import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
  ShoppingBag
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import OrderStatus from "@/components/buyer/order-status";
import { apiRequest } from "@/lib/queryClient";

interface OrderWithPreview extends Order {
  previewImage?: string | null;
}

export default function BuyerOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const uploadLabel = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      apiRequest("POST", `/api/orders/${id}/shipping-label`, {
        shippingLabel: label,
      }).then((r) => r.json()),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => setUploadingId(null),
  });
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: orders = [], isLoading } = useQuery<OrderWithPreview[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
  });

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: number,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingId(id);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target && evt.target.result) {
        uploadLabel.mutate({ id, label: evt.target.result.toString() });
      }
    };
    reader.onerror = () => setUploadingId(null);
    reader.readAsDataURL(files[0]);
  };
  
  const filteredOrders = orders.filter(order => {
    if (filter !== "all" && order.status !== filter) {
      return false;
    }
    if (searchTerm && !order.code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <>
      <Header />
      <input
        type="file"
        accept="application/pdf,image/*"
        ref={fileInputRef}
        onChange={(e) => uploadingId && handleFileUpload(e, uploadingId)}
        className="hidden"
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">
          My Orders
        </h1>
        
        <Card>
          <CardHeader className="md:static sticky top-16 z-20 bg-white border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View and track all your orders</CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order code"
                    className="pl-10 w-full sm:w-[200px] rounded-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value)}
                >
                  <SelectTrigger className="w-full sm:w-[180px] rounded-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="awaiting_wire">Awaiting Wire</SelectItem>
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
              <>
                {/* Desktop layout */}
                <div className="space-y-6 hidden sm:block">
                  {filteredOrders.map((order) => (
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
                              Placed on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
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

                        {order.status === "awaiting_wire" && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/wire-instructions">Wire Instructions</Link>
                          </Button>
                        )}

                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/orders/${order.id}/invoice.pdf`} target="_blank" download>
                            Download Invoice
                          </a>
                        </Button>
                        {order.shippingChoice === "buyer" && (
                          order.shippingLabel ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={order.shippingLabel} download>
                                Download Label
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadingId(order.id);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploadingId === order.id}
                            >
                              {uploadingId === order.id ? "Uploading..." : "Upload Label"}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile layout */}
                <Accordion type="single" collapsible className="block sm:hidden">
                  {filteredOrders.map((order) => (
                    <AccordionItem key={order.id} value={String(order.id)} className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-2 text-left">
                        <div className="flex items-start gap-3 w-full">
                          {order.previewImage && (
                            <img
                              src={order.previewImage}
                          alt={`Order ${order.code} item`}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex flex-col flex-1 gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Order #{order.code}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
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
                            <p className="text-sm text-gray-500 flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Placed on {formatDate(order.createdAt)}
                            </p>
                            <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
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
                          {order.status === "awaiting_wire" && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/wire-instructions">Wire Instructions</Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/api/orders/${order.id}/invoice.pdf`} target="_blank" download>
                              Download Invoice
                            </a>
                          </Button>
                          {order.shippingChoice === "buyer" && (
                            order.shippingLabel ? (
                              <Button variant="outline" size="sm" asChild>
                                <a href={order.shippingLabel} download>
                                  Download Label
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUploadingId(order.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={uploadingId === order.id}
                              >
                                {uploadingId === order.id ? "Uploading..." : "Upload Label"}
                              </Button>
                            )
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
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