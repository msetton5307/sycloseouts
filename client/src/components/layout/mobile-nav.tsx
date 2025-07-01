import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User, ListOrdered, MessageCircle, DollarSign, CalendarIcon } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function MobileNav() {
  const [location] = useLocation();
  const { itemCount, setIsCartOpen } = useCart();
  const { user, logoutMutation } = useAuth();
  const [openAccount, setOpenAccount] = useState(false);

  const profileLink = user
    ? user.role === "seller"
      ? "/seller/dashboard#profile"
      : "/buyer/profile"
    : "/auth";

  const accountLink = user
    ? user.role === "seller"
      ? "/seller/dashboard"
      : user.role === "admin"
      ? "/admin/dashboard"
      : "/buyer/home"
    : "/auth";

  const isActive = (path: string) => location === path;

  return (
    <Sheet open={openAccount} onOpenChange={setOpenAccount}>
      {user ? (
        <SheetContent side="bottom" className="p-6 space-y-4 sm:hidden">
          <Button className="w-full" onClick={() => (window.location.href = profileLink)}>
            Profile
          </Button>
          <Button variant="outline" className="w-full" onClick={() => logoutMutation.mutate()}>
            Sign Out
          </Button>
        </SheetContent>
      ) : (
        <SheetContent side="bottom" className="p-6 space-y-4 sm:hidden">
          <Link href="/auth">
            <Button className="w-full">Sign In</Button>
          </Link>
        </SheetContent>
      )}

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
        {user?.role === "seller" && (
          <li className="flex-1">
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
          <li className="flex-1">
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
          <li className="flex-1">
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
          <li className="flex-1">
            <Link
              href={user.role === "buyer" ? "/buyer/messages" : "/seller/messages"}
              className={`flex flex-col items-center py-2 text-xs ${isActive(user.role === "buyer" ? "/buyer/messages" : "/seller/messages") ? "text-primary" : "text-gray-500"}`}
            >
              <MessageCircle className="h-5 w-5" />
              Messages
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
          {user ? (
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center py-2 text-xs ${isActive(accountLink) ? "text-primary" : "text-gray-500"} w-full`}
              >
                <User className="h-5 w-5" />
                {user.role === "seller" ? "Dashboard" : "Account"}
              </button>
            </SheetTrigger>
          ) : (
            <Link
              href={accountLink}
              className={`flex flex-col items-center py-2 text-xs ${isActive(accountLink) ? "text-primary" : "text-gray-500"}`}
            >
              <User className="h-5 w-5" />
              Account
            </Link>
          )}
        </li>
      </ul>
    </nav>
    </Sheet>
  );
}
