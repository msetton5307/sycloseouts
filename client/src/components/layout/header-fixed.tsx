import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Search,
  ShoppingCart,
  MessageCircle,
  Menu,
  X,
  User as UserIcon,
  LogOut
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useUnreadMessages } from "@/hooks/use-messages";
import CartDrawer from "@/components/cart/cart-drawer";
import MobileNav from "@/components/layout/mobile-nav";

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const unread = useUnreadMessages();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <span className="text-primary font-bold text-2xl cursor-pointer">SY Closeouts</span>
                </Link>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
                {[
                  !(user && user.role === 'seller') && { label: 'Home', href: '/' },
                  { label: 'Products', href: '/products' },
                  user?.role === 'admin' && { label: 'Admin', href: '/admin/dashboard' },
                  user?.role === 'admin' && { label: 'Tickets', href: '/admin/tickets' },
                  user?.role === 'buyer' && { label: 'My Orders', href: '/buyer/orders' },
                  user?.role === 'seller'
                    ? { label: 'Dashboard', href: '/seller/dashboard' }
                    : !user || user.role === 'buyer'
                    ? { label: 'Sell with Us', href: '/seller/apply' }
                    : null,
                  { label: 'About', href: '/about' },
                ]
                  .filter(Boolean)
                  .map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`${
                        isActive(href)
                          ? 'border-primary text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      {label}
                    </Link>
                  ))}
              </nav>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-gray-500 relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                    {itemCount > 99 ? '99+' : itemCount}
                  </Badge>
                )}
                <span className="sr-only">Cart</span>
              </Button>
              
              {user && (
                <Link href={user.role === "buyer" ? "/buyer/messages" : "/seller/messages"}>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500 relative">
                    <MessageCircle className="h-5 w-5" />
                    {unread > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                        {unread}
                      </Badge>
                    )}
                    <span className="sr-only">Messages</span>
                  </Button>
                </Link>
              )}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="https://github.com/shadcn.png" alt={user.username} />
                        <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span
                        className="cursor-pointer"
                        onClick={() => {
                          const path =
                            user.role === 'seller'
                              ? '/seller/dashboard#profile'
                              : '/buyer/profile';
                          window.location.href = path;
                        }}
                      >
                        Profile
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button className="bg-primary hover:bg-blue-700">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="-mr-2 flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="/">
                <div 
                  className={`${isActive('/') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </div>
              </Link>
              <Link href="/products">
                <div 
                  className={`${isActive('/products') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Products
                </div>
              </Link>
              <Link href="/seller/apply">
                <div 
                  className={`${isActive('/seller/apply') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sell with Us
                </div>
              </Link>
              <Link href="/about">
                <div 
                  className={`${isActive('/about') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </div>
              </Link>
            </div>
            
            {user ? (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="https://github.com/shadcn.png" alt={user.username} />
                      <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.firstName} {user.lastName}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
                  <div className="ml-auto flex space-x-4">
                    <Link href={user.role === "buyer" ? "/buyer/messages" : "/seller/messages"}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-gray-500 relative"
                      >
                        <MessageCircle className="h-5 w-5" />
                        {unread > 0 && (
                          <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                            {unread}
                          </Badge>
                        )}
                        <span className="sr-only">Messages</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-500 relative"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsCartOpen(true);
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {itemCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                          {itemCount > 99 ? '99+' : itemCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setIsMenuOpen(false);
                      const path =
                        user.role === 'seller'
                          ? '/seller/dashboard#profile'
                          : '/buyer/profile';
                      window.location.href = path;
                    }}
                  >
                    Profile
                  </div>
                  <div 
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Sign out
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex justify-center">
                  <Link href="/auth">
                    <Button 
                      className="w-full max-w-xs mx-4 bg-primary hover:bg-blue-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
      
      <CartDrawer />
      <MobileNav />
    </>
  );
}