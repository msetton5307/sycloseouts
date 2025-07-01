import { useEffect } from "react";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowLeft, ShoppingCart } from "lucide-react";
import CartItem from "@/components/cart/cart-item";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";

export default function CartPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  
  // Set cart as closed when visiting cart page
  useEffect(() => {
    const cartDrawer = document.querySelector('[data-state="open"]');
    if (cartDrawer) {
      const closeButton = cartDrawer.querySelector('button[aria-label="Close"]');
      if (closeButton) {
        (closeButton as HTMLButtonElement).click();
      }
    }
  }, []);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
          Your Cart
        </h1>
        
        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added any products to your cart yet.</p>
            <Link href="/products">
              <Button>
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle>Cart Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <CartItem key={item.productId} item={item} />
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={clearCart}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                  <Link href="/products">
                    <Button variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Continue Shopping
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
            
            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Subtotal</div>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(cartTotal)}</div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Shipping</div>
                    <div className="text-sm text-gray-900">Calculated at checkout</div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <div className="text-base font-medium text-gray-900">Total</div>
                    <div className="text-base font-medium text-gray-900">{formatCurrency(cartTotal)}</div>
                  </div>
                </div>
                
                <Link href={user ? "/checkout" : "/auth?redirect=/checkout"}>
                  <Button className="w-full mt-6" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>By proceeding to checkout, you agree to our <Link href="/terms"><a className="text-primary hover:underline">Terms of Service</a></Link> and <Link href="/privacy"><a className="text-primary hover:underline">Privacy Policy</a></Link>.</p>
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
