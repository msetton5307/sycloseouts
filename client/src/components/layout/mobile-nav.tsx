import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User, ListOrdered } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function MobileNav() {
  const [location] = useLocation();
  const { itemCount, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const accountLink = user
    ? user.role === "seller"
      ? "/seller/dashboard"
      : user.role === "admin"
      ? "/admin/dashboard"
      : "/buyer/home"
    : "/auth";

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-white shadow sm:hidden">
      <ul className="flex justify-around">
        {user?.role !== "seller" && (
          <li className="flex-1">
            <Link
              href="/"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/") ? "text-primary" : "text-gray-500"}`}
            >
              <Home className="h-5 w-5" />
              Home
            </Link>
          </li>
        )}
        <li className="flex-1">
          <Link
            href="/products"
            className={`flex flex-col items-center py-2 text-xs ${isActive("/products") ? "text-primary" : "text-gray-500"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            Shop
          </Link>
        </li>
        {user?.role === "buyer" && (
          <li className="flex-1">
            <Link
              href="/buyer/orders"
              className={`flex flex-col items-center py-2 text-xs ${isActive("/buyer/orders") ? "text-primary" : "text-gray-500"}`}
            >
              <ListOrdered className="h-5 w-5" />
              Orders
            </Link>
          </li>
        )}
        <li className="flex-1 relative">
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
        <li className="flex-1">
          <Link
            href={accountLink}
            className={`flex flex-col items-center py-2 text-xs ${isActive(accountLink) ? "text-primary" : "text-gray-500"}`}
          >
            <User className="h-5 w-5" />
            {user?.role === "seller" ? "Dashboard" : "Account"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
