import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { ProtectedRoute } from "./lib/protected-route";
import { ScrollToTop } from "@/lib/scroll-to-top";

// Pages
import HomePage from "@/pages/home-page";
import ProductsPage from "@/pages/products-page";
import ProductDetailPage from "@/pages/product-detail-page";
import AuthPage from "@/pages/auth-page";
import RegisterChoicePage from "@/pages/register";
import BuyerSignupPage from "@/pages/buyer/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import CartPage from "@/pages/cart-page";
import CheckoutPage from "@/pages/checkout-page";
import BuyerHomePage from "@/pages/buyer/home";
import BuyerOrdersPage from "@/pages/buyer/orders";
import BuyerOrderDetailPage from "@/pages/buyer/order-detail";
import BuyerProfilePage from "@/pages/buyer/profile";
import BuyerMessagesPage from "@/pages/buyer/messages";
import BuyerOffersPage from "@/pages/buyer/offers";
import SellerDashboard from "@/pages/seller/dashboard";
import SellerProducts from "@/pages/seller/products";
import SellerOrdersPage from "@/pages/seller/orders";
import SellerOffersPage from "@/pages/seller/offers";
import SellerOrderDetailPage from "@/pages/seller/order-detail";
import SellerMessagesPage from "@/pages/seller/messages";
import SellerAnalyticsPage from "@/pages/seller/analytics";
import SellerPayoutPage from "@/pages/seller/payouts";
import SellerApply from "@/pages/seller/apply";
import OrderMessagesPage from "@/pages/order-messages";
import ConversationPage from "@/pages/conversation";
import AdminDashboard from "@/pages/admin/dashboard";
import FeaturedProductsPage from "@/pages/admin/featured-products";
import AdminUsers from "@/pages/admin/users";
import AdminBillingPage from "@/pages/admin/billing";
import AdminOrderDetailPage from "@/pages/admin/order-detail";
import AdminOrdersPage from "@/pages/admin/orders";
import AdminApplications from "@/pages/admin/applications";
import HelpPage from "@/pages/help-page";
import AdminTicketsPage from "@/pages/admin/tickets";
import AdminMessagesPage from "@/pages/admin/messages";
import AdminUserProfilePage from "@/pages/admin/user-profile";
import AdminEmailTemplatesPage from "@/pages/admin/email-templates";
import AboutPage from "@/pages/about-page";
import SellerAgreementPage from "@/pages/seller-agreement";
import BuyerAgreementPage from "@/pages/buyer-agreement";
import NotificationsPage from "@/pages/notifications-page";
import SuspendedPage from "@/pages/suspended";
import WireInstructionsPage from "@/pages/wire-instructions";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterChoicePage} />
      <Route path="/buyer/signup" component={BuyerSignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/suspended" component={SuspendedPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/wire-instructions" component={WireInstructionsPage} />
      <Route path="/seller-agreement" component={SellerAgreementPage} />
      <Route path="/buyer-agreement" component={BuyerAgreementPage} />
      <Route path="/help" component={HelpPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} allowedRoles={["buyer", "seller", "admin"]} />
      
      {/* Public seller application route */}
      <Route path="/seller/apply" component={SellerApply} />

      {/* Buyer routes */}
      <ProtectedRoute path="/checkout" component={CheckoutPage} allowedRoles={["buyer", "seller", "admin"]} />
      <ProtectedRoute path="/buyer/home" component={BuyerHomePage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/orders" component={BuyerOrdersPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/messages" component={BuyerMessagesPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/offers" component={BuyerOffersPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/orders/:id" component={BuyerOrderDetailPage} allowedRoles={["buyer", "admin"]} />
      <ProtectedRoute path="/buyer/profile" component={BuyerProfilePage} allowedRoles={["buyer", "admin"]} />

      {/* Seller routes */}
      <ProtectedRoute path="/seller/dashboard" component={SellerDashboard} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/products" component={SellerProducts} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/offers" component={SellerOffersPage} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/orders" component={SellerOrdersPage} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/orders/:id" component={SellerOrderDetailPage} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/messages" component={SellerMessagesPage} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/analytics" component={SellerAnalyticsPage} allowedRoles={["seller"]} />
      <ProtectedRoute path="/seller/payouts" component={SellerPayoutPage} allowedRoles={["seller"]} />

      <ProtectedRoute path="/orders/:id/messages" component={OrderMessagesPage} allowedRoles={["buyer", "seller", "admin"]} />
      <ProtectedRoute path="/conversations/:id" component={ConversationPage} allowedRoles={["buyer", "seller", "admin"]} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/users/:id" component={AdminUserProfilePage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/billing" component={AdminBillingPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/orders" component={AdminOrdersPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/orders/:id" component={AdminOrderDetailPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/applications" component={AdminApplications} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/featured" component={FeaturedProductsPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/messages" component={AdminMessagesPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/email-templates" component={AdminEmailTemplatesPage} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/tickets" component={AdminTicketsPage} allowedRoles={["admin"]} />

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
            <ScrollToTop />
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;