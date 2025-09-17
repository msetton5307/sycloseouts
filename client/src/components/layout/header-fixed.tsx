import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  ShoppingCart,
  MessageCircle,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Phone,
  Mail,
  Clock
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
import { useSettings } from "@/hooks/use-settings";
import { motion } from "framer-motion";

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const unread = useUnreadMessages();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: settings } = useSettings();
  const [isScrolled, setIsScrolled] = useState(false);

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = (
    [
      !(user && user.role === "seller") && { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      user?.role === "admin" && { label: "Admin", href: "/admin/dashboard" },
      user?.role === "admin" && { label: "Tickets", href: "/admin/tickets" },
      user?.role === "buyer" && { label: "My Orders", href: "/buyer/orders" },
      (user?.role === "buyer" || user?.role === "seller") && {
        label: "Offers",
        href: "/buyer/offers",
      },
      user?.role === "seller"
        ? { label: "Dashboard", href: "/seller/dashboard" }
        : !user || user.role === "buyer"
        ? { label: "Sell with Us", href: "/seller/apply" }
        : null,
      { label: "About", href: "/about" },
      (user?.role === "buyer" || user?.role === "seller") && {
        label: "Support",
        href: "/help",
      },
    ].filter((link): link is { label: string; href: string } => Boolean(link))
  );

  const contactDetails = [
    {
      icon: Phone,
      label: "Call",
      value: "(866) 779-4202",
      href: "tel:18667794202",
    },
    {
      icon: Mail,
      label: "Email",
      value: "hello@sycloseouts.com",
      href: "mailto:hello@sycloseouts.com",
    },
    {
      icon: Clock,
      label: "Support",
      value: "Mon–Fri 9am-6pm EST",
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "backdrop-blur-xl bg-white/85 shadow-xl"
            : "bg-white/70 backdrop-blur"
        }`}
      >
        <div className="hidden md:block bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-2 text-sm">
            <p className="font-medium tracking-wide uppercase text-white/80">
              Trusted wholesale marketplace for verified buyers & sellers
            </p>
            <div className="flex items-center gap-6">
              {contactDetails.map(({ icon: Icon, label, value, href }) =>
                href ? (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                    aria-label={`${label} ${value}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold tracking-wide">{value}</span>
                  </a>
                ) : (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-white/80"
                    aria-label={`${label} ${value}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold tracking-wide">{value}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-10">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center gap-3 group">
                  {settings?.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-12 w-auto object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                      {settings?.siteTitle ?? "SY Closeouts"}
                    </span>
                  )}
                </Link>
              </div>
              <nav className="hidden lg:flex items-center gap-2">
                {navItems.map(({ label, href }, index) => (
                  <Link
                    key={href}
                    href={href}
                    className={`group relative inline-block uppercase tracking-[0.12em] ${
                      isActive(href)
                        ? "text-primary"
                        : "text-slate-600 hover:text-primary"
                    }`}
                  >
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, type: "spring", stiffness: 120 }}
                      className="relative inline-flex px-3 py-2 text-sm xl:text-base font-semibold"
                    >
                      {label}
                      <span
                        className={`pointer-events-none absolute left-0 bottom-0 h-1 w-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-300 ${
                          isActive(href)
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-x-0 group-hover:opacity-80 group-hover:scale-100"
                        }`}
                      />
                    </motion.span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-primary hover:bg-primary/10"
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-primary hover:bg-primary/10 relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-blue-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                    {itemCount > 99 ? "99+" : itemCount}
                  </Badge>
                )}
                <span className="sr-only">Cart</span>
              </Button>

              {user && (
                <Link href={user.role === "buyer" ? "/buyer/messages" : "/seller/messages"}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:text-primary hover:bg-primary/10 relative"
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
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-200 shadow-sm hover:border-primary/40 hover:shadow-md">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                        <AvatarFallback>
                          {user.firstName.charAt(0)}
                          {user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[12rem]">
                    <DropdownMenuItem>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span
                        className="cursor-pointer"
                        onClick={() => {
                          const path =
                            user.role === "seller"
                              ? "/seller/dashboard#profile"
                              : "/buyer/profile";
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
                  <Button className="bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/20 hover:from-blue-600 hover:to-primary">
                    Join Marketplace
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-primary hover:bg-primary/10"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
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
            <div className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white px-4 py-4 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
                Connect with our marketplace team
              </p>
              <div className="grid grid-cols-1 gap-3">
                {contactDetails.map(({ icon: Icon, label, value, href }) =>
                  href ? (
                    <a
                      key={label}
                      href={href}
                      className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2"
                    >
                      <Icon className="h-5 w-5 text-white" />
                      <div>
                        <p className="text-xs text-white/70">{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2"
                    >
                      <Icon className="h-5 w-5 text-white" />
                      <div>
                        <p className="text-xs text-white/70">{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
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
              {(user?.role === 'buyer' || user?.role === 'seller') && (
                <Link href="/help">
                  <div
                    className={`${isActive('/help') ? 'bg-primary border-primary text-white' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Support
                  </div>
                </Link>
              )}
            </div>
            
            {user ? (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
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