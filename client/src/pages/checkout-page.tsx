import { useState, useEffect } from "react";
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
import { Loader2, CheckCircle, CreditCard, Building, ShoppingCart } from "lucide-react";
import { InsertOrder, InsertOrderItem, PaymentMethod } from "@shared/schema";
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

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: "",
    nameOnCard: user ? `${user.firstName} ${user.lastName}` : "",
    expirationDate: "",
    cvc: "",
    paymentMethod: "credit_card",
    billingAddressSameAsShipping: true
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | number>("new");

  const [contactOption, setContactOption] = useState<"saved" | "new">(
    user?.phone || user?.email ? "saved" : "new"
  );

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
    const fetchPaymentMethods = async () => {
      if (!user) return;
      try {
        const res = await apiRequest("GET", "/api/payment-methods");
        const data = await res.json();
        setPaymentMethods(data);
        if (data.length > 0) {
          setSelectedPaymentId(data[0].id);
          setPaymentInfo((info) => ({
            ...info,
            cardNumber: "", // don't prefill sensitive data
            nameOnCard: data[0].cardholderName,
            expirationDate: `${data[0].expMonth}/${data[0].expYear}`,
            paymentMethod: "credit_card",
          }));
        }
      } catch (err) {
        console.error("Failed to load payment methods", err);
      }
    };
    fetchPaymentMethods();
  }, [user]);

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
    if (selectedPaymentId === "new") return;
    const pm = paymentMethods.find(p => p.id === selectedPaymentId);
    if (pm) {
      setPaymentInfo(info => ({
        ...info,
        nameOnCard: pm.cardholderName,
        expirationDate: `${pm.expMonth}/${pm.expYear}`,
        cardNumber: "",
        paymentMethod: "credit_card",
      }));
    }
  }, [selectedPaymentId, paymentMethods]);

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

      // Save or update payment method
      try {
        const [expMonth, expYear] = paymentInfo.expirationDate.split("/");
        if (selectedPaymentId === "new") {
          const createRes = await apiRequest("POST", "/api/payment-methods", {
            cardLast4: paymentInfo.cardNumber.slice(-4),
            cardholderName: paymentInfo.nameOnCard,
            expMonth,
            expYear,
            brand: "card",
          });
          const created = await createRes.json();
          setSelectedPaymentId(created.id);
        } else {
          await apiRequest("PUT", `/api/payment-methods/${selectedPaymentId}`, {
            cardLast4: paymentInfo.cardNumber.slice(-4),
            cardholderName: paymentInfo.nameOnCard,
            expMonth,
            expYear,
            brand: "card",
          });
        }
        const res = await apiRequest("GET", "/api/payment-methods");
        setPaymentMethods(await res.json());
      } catch (err) {
        console.error("Failed to save payment method", err);
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

        const last4 =
          selectedPaymentId === "new"
            ? paymentInfo.cardNumber.slice(-4)
            : paymentMethods.find((pm) => pm.id === selectedPaymentId)?.cardLast4 || "";

        const orderData: InsertOrder = {
          buyerId: user.id,
          sellerId: parseInt(sellerId),
          totalAmount: sellerTotal,
          status: "ordered",
          shippingDetails: shippingInfo,
          paymentDetails: {
            method: paymentInfo.paymentMethod,
            last4,
          },
          estimatedDeliveryDate: estimatedDelivery
        };

        const orderRes = await apiRequest("POST", "/api/orders", {
          ...orderData,
          items: sellerItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity
          }))
        });
        if (!orderRes.ok) throw new Error("Failed to create order");
        orders.push(await orderRes.json());
      }

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
          {paymentMethods.length > 0 && (
            <RadioGroup
              value={String(selectedPaymentId)}
              onValueChange={(value) => setSelectedPaymentId(value === "new" ? "new" : parseInt(value))}
              className="space-y-2 mt-2"
            >
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-start space-x-2 border rounded-md p-3">
                  <RadioGroupItem value={String(pm.id)} id={`pay-${pm.id}`} />
                  <label htmlFor={`pay-${pm.id}`} className="text-sm leading-none cursor-pointer">
                    {pm.brand} ending in {pm.cardLast4}
                  </label>
                </div>
              ))}
              <div className="flex items-start space-x-2 border rounded-md p-3">
                <RadioGroupItem value="new" id="new-payment" />
                <label htmlFor="new-payment" className="text-sm leading-none cursor-pointer">
                  Add New Payment Method
                </label>
              </div>
            </RadioGroup>
          )}
          <RadioGroup
            defaultValue="credit_card"
            value={paymentInfo.paymentMethod}
            onValueChange={(value) => setPaymentInfo({ ...paymentInfo, paymentMethod: value })}
            className="grid grid-cols-2 gap-4 mt-2"
          >
            <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label htmlFor="credit_card" className="flex items-center cursor-pointer">
                <CreditCard className="h-5 w-5 mr-2 text-primary" />
                Credit Card
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:bg-gray-50">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex items-center cursor-pointer">
                <Building className="h-5 w-5 mr-2 text-primary" />
                Bank Transfer
              </Label>
            </div>
          </RadioGroup>
        </div>

        {paymentInfo.paymentMethod === "credit_card" && selectedPaymentId === "new" && (
          <>
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentInfo.cardNumber}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="nameOnCard">Name on Card</Label>
              <Input
                id="nameOnCard"
                placeholder="John Doe"
                value={paymentInfo.nameOnCard}
                onChange={(e) => setPaymentInfo({ ...paymentInfo, nameOnCard: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  placeholder="MM/YY"
                  value={paymentInfo.expirationDate}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, expirationDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={paymentInfo.cvc}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, cvc: e.target.value })}
                  required
                />
              </div>
            </div>
          </>
        )}

        {paymentInfo.paymentMethod === "bank_transfer" && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm">
              After placing your order, you will receive bank transfer information.
              Your order will be processed once payment is received.
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
          <span className="text-sm font-medium">{order?.id || "N/A"}</span>
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
                  {items.map((item) => (
                    <li key={item.productId} className="py-4 flex">
                      <div className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-center object-cover"
                        />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
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
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(cartTotal)}</div>
                  </div>

                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Shipping</div>
                    <div className="text-sm text-gray-900">Calculated at next step</div>
                  </div>

                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Taxes</div>
                    <div className="text-sm text-gray-900">Calculated at next step</div>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <div className="text-base font-medium text-gray-900">Order Total</div>
                    <div className="text-base font-medium text-gray-900">{formatCurrency(cartTotal)}</div>
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