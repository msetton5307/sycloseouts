import { Link, useLocation } from "wouter";
import { ShoppingBag, ShoppingCart, ListOrdered, MessageCircle, DollarSign, CalendarIcon } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function MobileNav() {
  const [location] = useLocation();
  const { itemCount, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const isActive = (path: string) => location === path;

  return (
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-white shadow pb-2 [padding-bottom:env(safe-area-inset-bottom)] sm:hidden">
      <ul className="flex justify-around p-2">
        <li>
          <Link
            href="/products"
            className={`flex flex-col items-center py-2 text-xs ${isActive("/products") ? "text-primary" : "text-gray-500"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            Shop
          </Link>
        </li>
        {user?.role === "buyer" && (
          <li>
            <Link
              href="/buyer/orders"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/buyer/orders") ? "text-primary" : "text-gray-500"}`}
            >
              <ListOrdered className="h-5 w-5" />
              Orders
            </Link>
          </li>
        )}
        {user?.role === "buyer" && (
          <li>
            <Link
              href="/buyer/offers"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/buyer/offers") ? "text-primary" : "text-gray-500"}`}
            >
              <DollarSign className="h-5 w-5" />
              Offers
            </Link>
          </li>
        )}
        {user?.role === "seller" && (
          <li>
            <Link
              href="/seller/orders"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/seller/orders") ? "text-primary" : "text-gray-500"}`}
            >
              <ListOrdered className="h-5 w-5" />
              Orders
            </Link>
          </li>
        )}
        {user?.role === "seller" && (
          <li>
            <Link
              href="/seller/offers"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/seller/offers") ? "text-primary" : "text-gray-500"}`}
            >
              <DollarSign className="h-5 w-5" />
              Offers
            </Link>
          </li>
        )}
        {user?.role === "seller" && (
          <li>
            <Link
              href="/seller/payouts"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/seller/payouts") ? "text-primary" : "text-gray-500"}`}
            >
              <CalendarIcon className="h-5 w-5" />
              Payouts
            </Link>
          </li>
        )}
        {user && (
          <li>
            <Link
              href={user.role === "buyer" ? "/buyer/messages" : "/seller/messages"}
              className={`flex flex-col items-center py-2 text-xs ${isActive(user.role === "buyer" ? "/buyer/messages" : "/seller/messages") ? "text-primary" : "text-gray-500"}`}
            >
              <MessageCircle className="h-5 w-5" />
              Messages
            </Link>
          </li>
        )}
        <li className="relative">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center py-2 text-xs text-gray-500 w-full"
          >
            <ShoppingCart className="h-5 w-5" />
            Cart
          </button>
          {itemCount > 0 && (
            <Badge className="absolute top-1 right-4 bg-red-500 text-white text-[10px] h-4 w-4 flex items-center justify-center p-0">
              {itemCount > 99 ? "99+" : itemCount}
            </Badge>
          )}
        </li>
      </ul>
    </nav>
  );
}
