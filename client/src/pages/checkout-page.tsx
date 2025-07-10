import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getEstimatedDeliveryDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, Building, Banknote, ShoppingCart, ImagePlus } from "lucide-react";
import { InsertOrder, InsertOrderItem, CartItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { items, cartTotal, clearCart } = useCart();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"shipping" | "payment" | "confirmation">("shipping");
  const [order, setOrder] = useState<any | null>(null);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);

  const [resaleCertUrl, setResaleCertUrl] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number>("new");

  const [shippingInfo, setShippingInfo] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : "",
    company: user?.company || "",
    address: user?.address || "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    phone: user?.phone || "",
    email: user?.email || "",
    notes: ""
  });

  const [itemShippings, setItemShippings] = useState<Record<number, { responsibility: string; type: string; fee?: number }>>({});
  const [shippingChoices, setShippingChoices] = useState<Record<number, { choice: "seller" | "buyer"; carrier: string }>>({});

  const shippingCost = items.reduce((sum, item) => {
    const info = itemShippings[item.productId];
    const choice = shippingChoices[item.productId]?.choice;
    if (info && info.responsibility === "seller_fee" && choice === "seller") {
      return sum + (info.fee || 0);
    }
    return sum;
  }, 0);

  const allBuyerArranged = items.every(item => {
    const info = itemShippings[item.productId];
    const choice = shippingChoices[item.productId]?.choice;
    return info && (info.responsibility === "buyer" || choice === "buyer");
  });

  const shippingLabel = shippingCost > 0 ? formatCurrency(shippingCost) : allBuyerArranged ? "Buyer arranged" : "Free";

  const orderSubtotal = orderedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const [paymentInfo, setPaymentInfo] = useState({
    routingNumber: "",
    accountNumber: "",
    paymentMethod: "wire",
    billingAddressSameAsShipping: true,
  });


  const [contactOption, setContactOption] = useState<"saved" | "new">(
    user?.phone || user?.email ? "saved" : "new"
  );

  const handleResaleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCert(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target && ev.target.result) {
        setResaleCertUrl(ev.target.result.toString());
      }
      setUploadingCert(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      setUploadingCert(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerResaleUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const res = await apiRequest("GET", "/api/addresses");
        const data = await res.json();
        setAddresses(data);
        if (data.length > 0) {
          setSelectedAddressId(data[0].id);
          setShippingInfo({
            ...data[0],
            email: user.email || "",
            notes: "",
          });
        }
      } catch (err) {
        console.error("Failed to load addresses", err);
      }
    };
    fetchAddresses();
  }, [user]);

  useEffect(() => {
    const fetchShipping = async () => {
      if (items.length === 0) return;
      const shipData: Record<number, { responsibility: string; type: string; fee?: number }> = {};
      const choiceData: Record<number, { choice: "seller" | "buyer"; carrier: string }> = {};
      for (const item of items) {
        try {
          const res = await fetch(`/api/products/${item.productId}`);
          if (res.ok) {
            const data = await res.json();
            shipData[item.productId] = { responsibility: data.shippingResponsibility, type: data.shippingType, fee: data.shippingFee };
            choiceData[item.productId] = { choice: data.shippingResponsibility === "buyer" ? "buyer" : "seller", carrier: "" };
          }
        } catch (err) {
          console.error("Failed to fetch product shipping", err);
        }
      }
      setItemShippings(shipData);
      setShippingChoices(prev => ({ ...prev, ...choiceData }));
    };
    fetchShipping();
  }, [items]);


  useEffect(() => {
    if (selectedAddressId === "new") return;
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (addr) {
      setShippingInfo(info => ({
        ...info,
        ...addr,
      }));
    }
  }, [selectedAddressId, addresses]);


  useEffect(() => {
    if (contactOption === "saved" && user) {
      setShippingInfo(info => ({
        ...info,
        phone: user.phone || "",
        email: user.email || "",
      }));
    }
  }, [contactOption, user]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const item of items) {
      const choice = shippingChoices[item.productId]?.choice;
      const carrier = shippingChoices[item.productId]?.carrier;
      const ship = itemShippings[item.productId];
      if ((choice === "buyer" || ship?.responsibility === "buyer") && !carrier) {
        toast({
          title: "Carrier required",
          description: `Please specify shipping company for ${item.title}`,
          variant: "destructive"
        });
        return;
      }
    }
    setCurrentStep("payment");
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete your purchase",
        variant: "destructive"
      });

      setLocation("/auth?redirect=/checkout");
      return;
    }

    if (paymentInfo.paymentMethod === "ach" && (!paymentInfo.routingNumber || !paymentInfo.accountNumber)) {
      toast({
        title: "Bank details required",
        description: "Please enter your routing and account numbers",
        variant: "destructive"
      });
      return;
    }

    if (user.role === "seller" && !user.resaleCertUrl && !resaleCertUrl) {
      toast({
        title: "Resale certificate required",
        description: "Please upload your resale certificate to continue",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (items.length === 0) {
        throw new Error("Your cart is empty");
      }

      // Save phone and address for future checkouts
      try {
        await apiRequest("PUT", "/api/users/me", {
          phone: shippingInfo.phone,
          address: shippingInfo.address,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } catch (err) {
        console.error("Failed to save contact info", err);
      }

      if (user.role === "seller" && !user.resaleCertUrl && resaleCertUrl) {
        try {
          await apiRequest("PUT", "/api/users/me", {
            resaleCertUrl,
            resaleCertStatus: "pending",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } catch (err) {
          console.error("Failed to save resale certificate", err);
        }
      }

      // Save or update shipping address
      try {
        if (selectedAddressId === "new") {
          const createRes = await apiRequest("POST", "/api/addresses", shippingInfo);
          const created = await createRes.json();
          setSelectedAddressId(created.id);
        } else {
          await apiRequest(
            "PUT",
            `/api/addresses/${selectedAddressId}`,
            shippingInfo,
          );
        }
        const res = await apiRequest("GET", "/api/addresses");
        setAddresses(await res.json());
      } catch (err) {
        console.error("Failed to save address", err);
      }



      // Group items by seller
      const itemsBySeller: Record<number, any[]> = {};
      for (const item of items) {
        const res = await fetch(`/api/products/${item.productId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch product ${item.productId}`);
        }
        const product = await res.json();
        if (!itemsBySeller[product.sellerId]) {
          itemsBySeller[product.sellerId] = [];
        }
        itemsBySeller[product.sellerId].push({ ...item, product });
      }

      // Create orders per seller
      const orders = [];
      for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
        const estimatedDelivery = getEstimatedDeliveryDate();
        const sellerTotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const firstItem = sellerItems[0];
        const firstChoice = shippingChoices[firstItem.productId];
        const orderData: InsertOrder = {
          buyerId: user.id,
          sellerId: parseInt(sellerId),
          totalAmount: sellerTotal,
          status: paymentInfo.paymentMethod === "wire" ? "awaiting_wire" : "ordered",
          shippingDetails: shippingInfo,
          shippingChoice: firstChoice?.choice,
          shippingCarrier: firstChoice?.choice === "buyer" ? firstChoice?.carrier : undefined,
          paymentDetails: {
            method: paymentInfo.paymentMethod,
            routingNumber: paymentInfo.routingNumber || undefined,
            accountNumber: paymentInfo.accountNumber || undefined,
          },
          estimatedDeliveryDate: estimatedDelivery
        };

        const orderRes = await apiRequest("POST", "/api/orders", {
          ...orderData,
          items: sellerItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            selectedVariations: i.selectedVariations,
            shippingChoice: shippingChoices[i.productId]?.choice,
            shippingCarrier: shippingChoices[i.productId]?.carrier,
          }))
        });
        if (!orderRes.ok) throw new Error("Failed to create order");
        orders.push(await orderRes.json());
      }

      setOrderedItems(items);
      clearCart();
      setOrder(orders[0]);
      setCurrentStep("confirmation");

    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderShippingForm = () => (
    <form onSubmit={handleShippingSubmit}>
      <div className="space-y-6">
        {items.map((item, idx) => {
          const ship = itemShippings[item.productId];
          if (!ship) return null;
          const choice = shippingChoices[item.productId]?.choice || "seller";
          return (
            <div key={item.productId} className="border-b pb-4">
              <h3 className="font-semibold mb-2">
                Shipment {idx + 1} of {items.length}: {item.title}
              </h3>
              {ship.responsibility === "seller_free" && (
                <p>Seller provides free {ship.type.toUpperCase()} shipping.</p>
              )}
              {ship.responsibility === "seller_fee" && (
                <>
                  <p>
                    Seller offers {ship.type.toUpperCase()} shipping for a fee of {formatCurrency(ship.fee || 0)}.
                  </p>
                  <RadioGroup
                    value={choice}
                    onValueChange={(val) =>
                      setShippingChoices((prev) => ({
                        ...prev,
                        [item.productId]: { ...prev[item.productId], choice: val as "seller" | "buyer" },
                      }))
                    }
                    className="space-y-2 mt-2"
                  >
                    <div className="flex items-start space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="seller" id={`ship-seller-${item.productId}`} />
                      <label htmlFor={`ship-seller-${item.productId}`} className="text-sm leading-none cursor-pointer">
                        Use seller shipping
                      </label>
                    </div>
                    <div className="flex items-start space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="buyer" id={`ship-buyer-${item.productId}`} />
                      <label htmlFor={`ship-buyer-${item.productId}`} className="text-sm leading-none cursor-pointer">
                        I'll arrange shipping
                      </label>
                    </div>
                  </RadioGroup>
                </>
              )}
              {ship.responsibility === "buyer" && (
                <p>Buyer must arrange {ship.type.toUpperCase()} shipping.</p>
              )}
              {(choice === "buyer" || ship.responsibility === "buyer") && (
                <div className="mt-4">
                  <Label htmlFor={`carrier-${item.productId}`}>Shipping Company</Label>
                  <Input
                    id={`carrier-${item.productId}`}
                    value={shippingChoices[item.productId]?.carrier || ""}
                    onChange={(e) =>
                      setShippingChoices((prev) => ({
                        ...prev,
                        [item.productId]: { ...prev[item.productId], carrier: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
              )}
            </div>
          );
        })}
        {addresses.length > 0 && (
          <div>
            <Label>Saved Addresses</Label>
            <RadioGroup
              value={String(selectedAddressId)}
              onValueChange={(value) =>
                setSelectedAddressId(value === "new" ? "new" : parseInt(value))
              }
              className="space-y-2 mt-2"
            >
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start space-x-2 border rounded-md p-3"
                >
                  <RadioGroupItem
                    value={String(addr.id)}
                    id={`checkout-addr-${addr.id}`}
                  />
                  <label
                    htmlFor={`checkout-addr-${addr.id}`}
                    className="text-sm leading-none cursor-pointer"
                  >
                    {addr.address}, {addr.city}
                  </label>
                </div>
              ))}
              <div className="flex items-start space-x-2 border rounded-md p-3">
                <RadioGroupItem value="new" id="checkout-new-address" />
                <label
                  htmlFor="checkout-new-address"
                  className="text-sm leading-none cursor-pointer"
                >
                  Add New Address
                </label>
              </div>
            </RadioGroup>
          </div>
        )}

        {(user?.phone || user?.email) && (
          <div>
            <Label>Contact Info</Label>
            <RadioGroup
              value={contactOption}
              onValueChange={(value) =>
                setContactOption(value as "saved" | "new")
              }
              className="space-y-2 mt-2"
            >
              <div className="flex items-start space-x-2 border rounded-md p-3">
                <RadioGroupItem value="saved" id="contact-saved" />
                <label
                  htmlFor="contact-saved"
                  className="text-sm leading-none cursor-pointer"
                >
                  {user?.phone} {user?.email ? `| ${user.email}` : ""}
                </label>
              </div>
              <div className="flex items-start space-x-2 border rounded-md p-3">
                <RadioGroupItem value="new" id="contact-new" />
                <label
                  htmlFor="contact-new"
                  className="text-sm leading-none cursor-pointer"
                >
                  Add New Contact Info
                </label>
              </div>
            </RadioGroup>
          </div>
        )}

        {(selectedAddressId === "new" || addresses.length === 0) && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={shippingInfo.name}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  value={shippingInfo.company}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, company: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={shippingInfo.address}
                onChange={(e) =>
                  setShippingInfo({ ...shippingInfo, address: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={shippingInfo.city}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, city: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  value={shippingInfo.state}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, state: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                <Input
                  id="zipCode"
                  value={shippingInfo.zipCode}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, zipCode: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={shippingInfo.country}
                  onValueChange={(value) =>
                    setShippingInfo({ ...shippingInfo, country: value })
                  }
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Mexico">Mexico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {(contactOption === "new" || !(user?.phone || user?.email)) && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-6">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={shippingInfo.phone}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={shippingInfo.email}
                  onChange={(e) =>
                    setShippingInfo({ ...shippingInfo, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </>
        )}
        <div>
          <Label htmlFor="notes">Order Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special instructions for delivery"
            value={shippingInfo.notes}
            onChange={(e) =>
              setShippingInfo({ ...shippingInfo, notes: e.target.value })
            }
          />
        </div>

        {user?.role === "seller" && !user.resaleCertUrl && (
          <div>
            <Label>Resale Certificate</Label>
            <input type="hidden" value={resaleCertUrl} readOnly />
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={triggerResaleUpload}
              disabled={uploadingCert}
            >
              {uploadingCert ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {resaleCertUrl ? "Replace File" : "Upload File"}
                </>
              )}
            </Button>
            {resaleCertUrl && (
              <p className="text-xs text-gray-500 mt-1">File attached</p>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleResaleUpload}
              className="hidden"
              accept="application/pdf,image/*"
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          Continue to Payment
        </Button>
      </div>
    </form>
  );

  const renderPaymentForm = () => (
    <form onSubmit={handlePaymentSubmit}>
      <div className="space-y-6">
        <div>
          <Label>Payment Method</Label>
          <RadioGroup
            defaultValue="wire"
            value={paymentInfo.paymentMethod}
            onValueChange={(value) => setPaymentInfo({ ...paymentInfo, paymentMethod: value as any })}
            className="grid grid-cols-2 gap-4 mt-2"
          >
            <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="wire" id="wire" />
              <Label htmlFor="wire" className="flex items-center cursor-pointer">
                <Banknote className="h-5 w-5 mr-2 text-primary" />
                Wire Transfer
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="ach" id="ach" />
              <Label htmlFor="ach" className="flex items-center cursor-pointer">
                <Building className="h-5 w-5 mr-2 text-primary" />
                ACH Billing
              </Label>
            </div>
          </RadioGroup>
        </div>


        {paymentInfo.paymentMethod === "ach" && (
          <>
            <div>
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                value={paymentInfo.routingNumber}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, routingNumber: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={paymentInfo.accountNumber}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, accountNumber: e.target.value })
                }
                required
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm">
                Your bank account will be charged after we process your order.
              </p>
            </div>
          </>
        )}

        {paymentInfo.paymentMethod === "wire" && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm">
              Wire instructions will be sent to your email after placing the order.
            </p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="billingAddressSameAsShipping"
            checked={paymentInfo.billingAddressSameAsShipping}
            onChange={(e) => setPaymentInfo({ ...paymentInfo, billingAddressSameAsShipping: e.target.checked })}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <Label htmlFor="billingAddressSameAsShipping" className="text-sm">
            Billing address same as shipping address
          </Label>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep("shipping")}
            className="flex-1"
          >
            Back to Shipping
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </div>
      </div>
    </form>
  );

  const renderConfirmation = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
      <p className="text-gray-500 mb-6">
        Thank you for your purchase. Your order has been received.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Order Number:</span>
          <span className="text-sm font-medium">{order?.code || "N/A"}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Order Date:</span>
          <span className="text-sm">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Total Amount:</span>
          <span className="text-sm">{formatCurrency(order?.totalAmount || cartTotal)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Payment Method:</span>
          <span className="text-sm capitalize">{paymentInfo.paymentMethod.replace('_', ' ')}</span>
        </div>
        {order?.trackingNumber && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Tracking Number:</span>
            <span className="text-sm">{order.trackingNumber}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="flex-1" asChild>
          <Link href="/buyer/orders">View Order</Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-2">
          Checkout
        </h1>

        {items.length === 0 && currentStep !== "confirmation" ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">You don't have any items to checkout.</p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
            <div className="lg:col-span-7">
              <div className="mb-8">
                <div className="relative">
                  <div className="absolute top-4 w-full h-0.5 bg-gray-200 z-0"></div>
                  <ul className="relative z-10 flex justify-between">
                    <li className="flex flex-col items-center">
                      <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "shipping" ? "bg-primary text-white" : (currentStep === "payment" || currentStep === "confirmation") ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                        1
                      </div>
                      <span className="mt-2 text-sm font-medium">Shipping</span>
                    </li>
                    <li className="flex flex-col items-center">
                      <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "payment" ? "bg-primary text-white" : currentStep === "confirmation" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                        2
                      </div>
                      <span className="mt-2 text-sm font-medium">Payment</span>
                    </li>
                    <li className="flex flex-col items-center">
                      <div className={`rounded-full h-8 w-8 flex items-center justify-center ${currentStep === "confirmation" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                        3
                      </div>
                      <span className="mt-2 text-sm font-medium">Confirmation</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {currentStep === "shipping" && "Shipping Information"}
                    {currentStep === "payment" && "Payment Information"}
                    {currentStep === "confirmation" && "Order Confirmation"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentStep === "shipping" && renderShippingForm()}
                  {currentStep === "payment" && renderPaymentForm()}
                  {currentStep === "confirmation" && renderConfirmation()}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>

                <ul className="divide-y divide-gray-200 mb-6">
                  {(currentStep === "confirmation" ? orderedItems : items).map((item) => (
                    <li key={item.productId + (item.variationKey || '')} className="py-4 flex">
                      <div className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-center object-cover"
                        />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                        {item.selectedVariations && (
                          <p className="text-xs text-gray-500">
                            {Object.entries(item.selectedVariations).map(([k,v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                        <div className="flex justify-between mt-1">
                          <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.price)}</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Subtotal</div>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(currentStep === "confirmation" ? orderSubtotal : cartTotal)}</div>
                  </div>

                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Shipping</div>
                    <div className="text-sm text-gray-900">{shippingLabel}</div>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <div className="text-base font-medium text-gray-900">Order Total</div>
                    <div className="text-base font-medium text-gray-900">{formatCurrency((currentStep === "confirmation" ? orderSubtotal : cartTotal) + shippingCost)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}