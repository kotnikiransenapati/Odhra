import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { VendorImpersonationProvider } from "@/contexts/VendorImpersonationContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeApplier } from "@/components/theme/ThemeApplier";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { BehaviorTrackingProvider } from "@/components/tracking/BehaviorTrackingProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CookieConsentBanner } from "@/components/notifications/CookieConsentBanner";

// Defer non-critical global components to after initial render
const NotificationPermissionPrompt = lazy(() => import("@/components/notifications/NotificationPermissionPrompt").then(m => ({ default: m.NotificationPermissionPrompt })));
const LivePurchaseNotification = lazy(() => import("@/components/marketing/LivePurchaseNotification").then(m => ({ default: m.LivePurchaseNotification })));
const CartReservationTimer = lazy(() => import("@/components/marketing/CartReservationTimer").then(m => ({ default: m.CartReservationTimer })));
const SmartInstallPrompt = lazy(() => import("@/components/marketing/SmartInstallPrompt").then(m => ({ default: m.SmartInstallPrompt })));
const DailyCheckin = lazy(() => import("@/components/loyalty/DailyCheckin").then(m => ({ default: m.DailyCheckin })));
const LiveChatWidget = lazy(() => import("@/components/chat/LiveChatWidget").then(m => ({ default: m.LiveChatWidget })));
const WhatsAppFloatingButton = lazy(() => import("@/components/chat/WhatsAppFloatingButton").then(m => ({ default: m.WhatsAppFloatingButton })));
const OfflineIndicator = lazy(() => import("@/components/ui/OfflineIndicator").then(m => ({ default: m.OfflineIndicator })));

// Deferred global hooks - load after first paint
const DeferredHooksInner = lazy(() => import("@/components/DeferredHooks"));

function GlobalHooks() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Delay non-critical hooks until after first meaningful paint
    const timeout = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(timeout);
  }, []);
  
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <DeferredHooksInner />
    </Suspense>
  );
}

// Defer global widgets (chat, notifications, etc.) to well after first paint
function DeferredGlobalWidgets() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(timeout);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <NotificationPermissionPrompt />
      <LivePurchaseNotification />
      <CartReservationTimer />
      <SmartInstallPrompt />
      <LiveChatWidget />
      <WhatsAppFloatingButton />
      <DailyCheckin variant="popup" />
      <OfflineIndicator />
    </Suspense>
  );
}



// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";

// Retry wrapper for lazy imports — handles chunk loading failures gracefully
function lazyRetry(importFn: () => Promise<any>, retries = 2): ReturnType<typeof lazy> {
  return lazy(() =>
    importFn().catch((err) => {
      if (retries > 0) {
        return new Promise<any>((resolve) => setTimeout(resolve, 1000)).then(() =>
          lazyRetry(importFn, retries - 1) ? importFn() : Promise.reject(err)
        );
      }
      // Force reload on persistent chunk failures (stale deployment)
      window.location.reload();
      return importFn(); // fallback
    })
  );
}

// Lazy load non-critical pages with retry
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const Cart = lazyRetry(() => import("./pages/Cart"));
const Checkout = lazyRetry(() => import("./pages/Checkout"));
const OrderSuccess = lazyRetry(() => import("./pages/OrderSuccess"));
const Orders = lazyRetry(() => import("./pages/customer/Orders"));
const OrderDetail = lazyRetry(() => import("./pages/customer/OrderDetail"));
const Addresses = lazyRetry(() => import("./pages/customer/Addresses"));
const Settings = lazyRetry(() => import("./pages/customer/Settings"));
const CustomerWallet = lazyRetry(() => import("./pages/customer/Wallet"));
const CustomerRewards = lazyRetry(() => import("./pages/customer/Rewards"));
const CustomerAnalytics = lazyRetry(() => import("./pages/customer/Analytics"));
const CustomerNotifications = lazyRetry(() => import("./pages/customer/Notifications"));
const Wishlist = lazyRetry(() => import("./pages/Wishlist"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const VendorDashboard = lazyRetry(() => import("./pages/vendor/VendorDashboard"));
const VendorOnboarding = lazyRetry(() => import("./pages/vendor/VendorOnboarding"));
const VendorProducts = lazyRetry(() => import("./pages/vendor/VendorProducts"));
const VendorProductForm = lazyRetry(() => import("./pages/vendor/VendorProductForm"));
const VendorOrders = lazyRetry(() => import("./pages/vendor/VendorOrders"));
const VendorWallet = lazyRetry(() => import("./pages/vendor/VendorWallet"));
const VendorAnalytics = lazyRetry(() => import("./pages/vendor/VendorAnalytics"));
const VendorSettings = lazyRetry(() => import("./pages/vendor/VendorSettings"));
const CustomerAccount = lazyRetry(() => import("./pages/customer/CustomerAccount"));
const Support = lazyRetry(() => import("./pages/customer/Support"));
const SupportTicketDetail = lazyRetry(() => import("./pages/customer/SupportTicketDetail"));
const EmailPreferences = lazyRetry(() => import("./pages/customer/EmailPreferences"));
const OrderTracking = lazyRetry(() => import("./pages/customer/OrderTracking"));
const ReturnRequest = lazyRetry(() => import("./pages/customer/ReturnRequest"));
const CustomerReturns = lazyRetry(() => import("./pages/customer/Returns"));
const SpinToWin = lazyRetry(() => import("./pages/SpinToWin"));
const FlashSales = lazyRetry(() => import("./pages/FlashSales"));
const About = lazyRetry(() => import("./pages/About"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const FAQ = lazyRetry(() => import("./pages/FAQ"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Install = lazyRetry(() => import("./pages/Install"));
const Offline = lazyRetry(() => import("./pages/Offline"));
const VendorStorefront = lazyRetry(() => import("./pages/VendorStorefront"));
const CustomerSubscriptions = lazyRetry(() => import("./pages/customer/Subscriptions"));
const CCEDashboard = lazyRetry(() => import("./pages/cce/CCEDashboard"));
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

// Loading fallback component with enhanced animation
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <motion.div 
      className="relative"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="w-12 h-12 rounded-full border-2 border-accent/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-accent"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-2 w-8 h-8 rounded-full bg-accent/10"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
    <motion.p 
      className="text-sm text-muted-foreground"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      Loading...
    </motion.p>
  </div>
);

// Lightweight route wrapper — no AnimatePresence to avoid Routes remount issues
function AnimatedRoutes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="odhra-ui-theme">
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
          <CartProvider>
            <BehaviorTrackingProvider>
            <VendorImpersonationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* ARIA live region for screen reader announcements */}
                <div aria-live="polite" aria-atomic="true" className="sr-only" id="aria-live-region" />
                <CartDrawer />
                <GlobalHooks />
                <ThemeApplier />
                <CookieConsentBanner />
                <DeferredGlobalWidgets />

                <Suspense fallback={<PageLoader />}>
                <AnimatedRoutes>
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
                    <Route path="/store/:slug" element={<VendorStorefront />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success/:orderId" element={<OrderSuccess />} />

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
                    <Route
                      path="/orders/:orderId/return"
                      element={
                        <ProtectedRoute>
                          <ReturnRequest />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account/returns"
                      element={
                        <ProtectedRoute>
                          <CustomerReturns />
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
                </AnimatedRoutes>
                </Suspense>
              </TooltipProvider>
            </VendorImpersonationProvider>
            </BehaviorTrackingProvider>
          </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
