import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { VendorImpersonationProvider } from "@/contexts/VendorImpersonationContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CartDrawer } from "@/components/cart/CartDrawer";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/customer/Orders";
import OrderDetail from "./pages/customer/OrderDetail";
import Addresses from "./pages/customer/Addresses";
import Settings from "./pages/customer/Settings";
import CustomerWallet from "./pages/customer/Wallet";
import CustomerAnalytics from "./pages/customer/Analytics";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorOnboarding from "./pages/vendor/VendorOnboarding";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorProductForm from "./pages/vendor/VendorProductForm";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorWallet from "./pages/vendor/VendorWallet";
import VendorAnalytics from "./pages/vendor/VendorAnalytics";
import VendorSettings from "./pages/vendor/VendorSettings";
import CustomerAccount from "./pages/customer/CustomerAccount";
import Support from "./pages/customer/Support";
import SupportTicketDetail from "./pages/customer/SupportTicketDetail";
import SpinToWin from "./pages/SpinToWin";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="odhra-ui-theme">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <VendorImpersonationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <CartDrawer />

                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/spin-to-win" element={<SpinToWin />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
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

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </VendorImpersonationProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
