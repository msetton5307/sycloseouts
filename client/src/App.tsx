import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import HomePage from "@/pages/home-page";
import ProductsPage from "@/pages/products-page";
import ProductDetailPage from "@/pages/product-detail-page";
import AuthPage from "@/pages/auth-page";
import CartPage from "@/pages/cart-page";
import CheckoutPage from "@/pages/checkout-page";
import BuyerHomePage from "@/pages/buyer/home";
import BuyerOrdersPage from "@/pages/buyer/orders";
import BuyerOrderDetailPage from "@/pages/buyer/order-detail";
import BuyerProfilePage from "@/pages/buyer/profile";
import SellerDashboard from "@/pages/seller/dashboard";
import SellerProducts from "@/pages/seller/products";
import SellerOrdersPage from "@/pages/seller/orders";
import SellerApply from "@/pages/seller/apply";
import AdminDashboard from "@/pages/admin/dashboard";
import FeaturedProductsPage from "@/pages/admin/featured-products";
import AdminUsers from "@/pages/admin/users";
import AdminApplications from "@/pages/admin/applications";
import AboutPage from "@/pages/about-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/about" component={AboutPage} />
      
      {/* Protected seller application route */}
      <ProtectedRoute path="/seller/apply" component={SellerApply} allowedRoles={["buyer", "seller", "admin"]} />

      {/* Buyer routes */}
      <ProtectedRoute path="/checkout" component={CheckoutPage} allowedRoles={["buyer", "seller", "admin"]} />
      <ProtectedRoute path="/buyer/home" component={BuyerHomePage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/orders" component={BuyerOrdersPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/orders/:id" component={BuyerOrderDetailPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/profile" component={BuyerProfilePage} allowedRoles={["buyer", "admin"]} />

      {/* Seller routes */}
      <ProtectedRoute path="/seller/dashboard" component={SellerDashboard} allowedRoles={["seller", "admin"]} />
      <ProtectedRoute path="/seller/products" component={SellerProducts} allowedRoles={["seller", "admin"]} />
      <ProtectedRoute path="/seller/orders" component={SellerOrdersPage} allowedRoles={["seller", "admin"]} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/applications" component={AdminApplications} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/featured" component={FeaturedProductsPage} allowedRoles={["admin"]} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
