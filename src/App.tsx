import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { VendorImpersonationProvider } from "@/contexts/VendorImpersonationContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CookieConsentBanner } from "@/components/notifications/CookieConsentBanner";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";
import { LivePurchaseNotification } from "@/components/marketing/LivePurchaseNotification";
import { CartReservationTimer } from "@/components/marketing/CartReservationTimer";
import { SmartInstallPrompt } from "@/components/marketing/SmartInstallPrompt";
import { DailyCheckin } from "@/components/loyalty/DailyCheckin";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";
import { usePriceDropNotifications } from "@/hooks/usePriceAlerts";
import { useCartAbandonmentTracker } from "@/hooks/useCartAbandonment";

// Global hooks wrapper
function GlobalHooks() {
  usePriceDropNotifications();
  useCartAbandonmentTracker();
  return null;
}

// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";

// Lazy load non-critical pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Orders = lazy(() => import("./pages/customer/Orders"));
const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
const Addresses = lazy(() => import("./pages/customer/Addresses"));
const Settings = lazy(() => import("./pages/customer/Settings"));
const CustomerWallet = lazy(() => import("./pages/customer/Wallet"));
const CustomerRewards = lazy(() => import("./pages/customer/Rewards"));
const CustomerAnalytics = lazy(() => import("./pages/customer/Analytics"));
const CustomerNotifications = lazy(() => import("./pages/customer/Notifications"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const VendorDashboard = lazy(() => import("./pages/vendor/VendorDashboard"));
const VendorOnboarding = lazy(() => import("./pages/vendor/VendorOnboarding"));
const VendorProducts = lazy(() => import("./pages/vendor/VendorProducts"));
const VendorProductForm = lazy(() => import("./pages/vendor/VendorProductForm"));
const VendorOrders = lazy(() => import("./pages/vendor/VendorOrders"));
const VendorWallet = lazy(() => import("./pages/vendor/VendorWallet"));
const VendorAnalytics = lazy(() => import("./pages/vendor/VendorAnalytics"));
const VendorSettings = lazy(() => import("./pages/vendor/VendorSettings"));
const CustomerAccount = lazy(() => import("./pages/customer/CustomerAccount"));
const Support = lazy(() => import("./pages/customer/Support"));
const SupportTicketDetail = lazy(() => import("./pages/customer/SupportTicketDetail"));
const EmailPreferences = lazy(() => import("./pages/customer/EmailPreferences"));
const OrderTracking = lazy(() => import("./pages/customer/OrderTracking"));
const SpinToWin = lazy(() => import("./pages/SpinToWin"));
const FlashSales = lazy(() => import("./pages/FlashSales"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Install = lazy(() => import("./pages/Install"));
const Offline = lazy(() => import("./pages/Offline"));
const CustomerSubscriptions = lazy(() => import("./pages/customer/Subscriptions"));
const CCEDashboard = lazy(() => import("./pages/cce/CCEDashboard"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default stale time
      gcTime: 5 * 60 * 1000, // 5 minutes cache time
      refetchOnWindowFocus: false, // Don't refetch on focus for better performance
      retry: 1, // Only retry once
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="odhra-ui-theme">
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
          <CartProvider>
            <VendorImpersonationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <CartDrawer />
                <GlobalHooks />
                <CookieConsentBanner />
                <NotificationPermissionPrompt />
                <LivePurchaseNotification />
                <CartReservationTimer />
                <SmartInstallPrompt />
                <LiveChatWidget />
                <DailyCheckin variant="popup" />

                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes - Critical (eagerly loaded) */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:slug" element={<ProductDetail />} />
                    
                    {/* Public Routes - Non-critical (lazy loaded) */}
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/spin-to-win" element={<SpinToWin />} />
                    <Route path="/flash-sales" element={<FlashSales />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/offline" element={<Offline />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route
                      path="/order-success/:orderId"
                      element={
                        <ProtectedRoute>
                          <OrderSuccess />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Customer Routes */}
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute>
                          <CustomerAccount />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orders"
                      element={
                        <ProtectedRoute>
                          <Orders />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orders/:orderId"
                      element={
                        <ProtectedRoute>
                          <OrderDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/addresses"
                      element={
                        <ProtectedRoute>
                          <Addresses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wallet"
                      element={
                        <ProtectedRoute>
                          <CustomerWallet />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <CustomerAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account/rewards"
                      element={
                        <ProtectedRoute>
                          <CustomerRewards />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account/notifications"
                      element={
                        <ProtectedRoute>
                          <CustomerNotifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account/subscriptions"
                      element={
                        <ProtectedRoute>
                          <CustomerSubscriptions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wishlist"
                      element={
                        <ProtectedRoute>
                          <Wishlist />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/support"
                      element={
                        <ProtectedRoute>
                          <Support />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/support/:ticketId"
                      element={
                        <ProtectedRoute>
                          <SupportTicketDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/email-preferences"
                      element={
                        <ProtectedRoute>
                          <EmailPreferences />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/track-order/:orderId"
                      element={
                        <ProtectedRoute>
                          <OrderTracking />
                        </ProtectedRoute>
                      }
                    />

                    {/* Vendor Onboarding - requires login but not vendor role */}
                    <Route
                      path="/become-vendor"
                      element={
                        <ProtectedRoute>
                          <VendorOnboarding />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Vendor Routes */}
                    <Route
                      path="/vendor"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/wallet"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorWallet />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/analytics"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/settings"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/products"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorProducts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/products/new"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorProductForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/products/:productId/edit"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorProductForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/orders"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorOrders />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vendor/*"
                      element={
                        <ProtectedRoute requiredRole="vendor">
                          <VendorDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Admin Routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected CCE Routes */}
                    <Route
                      path="/cce"
                      element={
                        <ProtectedRoute requiredRole="cce">
                          <CCEDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cce/*"
                      element={
                        <ProtectedRoute requiredRole="cce">
                          <CCEDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </VendorImpersonationProvider>
          </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
