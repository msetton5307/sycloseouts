import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/hooks/use-cart";
import CartItem from "./cart-item";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { ShoppingCart, ArrowRight } from "lucide-react";

export default function CartDrawer() {
  const {
    items,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    acceptedOffers,
    addOfferToCart,
  } = useCart();
  const offersToShow = acceptedOffers.filter(
    (o) => !items.some((it) => it.offerId === o.id)
  );
  
  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-6 border-b">
          <SheetTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Shopping Cart ({items.length})
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto p-6">
          {offersToShow.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Approved Offers</h3>
              <ul className="space-y-2">
                {offersToShow.map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    {o.productImages?.[0] && (
                      <img
                        src={o.productImages[0]}
                        alt={o.productTitle}
                        className="w-12 h-12 object-cover rounded mr-2"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{o.productTitle}</p>
                      <p className="text-xs text-gray-500">Qty {o.quantity}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addOfferToCart(o)}
                    >
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
              <Separator className="mt-4" />
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-sm text-gray-500">
              <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
            <p>Subtotal</p>
            <p>{formatCurrency(cartTotal)}</p>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <p>Shipping</p>
            <p>Calculated at checkout</p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Link href="/checkout">
                <Button className="w-full sm:w-auto">
                  Checkout
                </Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto mt-2 sm:mt-0 flex items-center justify-center"
              >
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
