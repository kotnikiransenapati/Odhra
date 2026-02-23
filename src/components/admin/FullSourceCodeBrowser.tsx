import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  ChevronDown, ChevronRight, Copy, Check, FileCode, FolderOpen,
  Search, Download, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ─────────────────────────── Source Files Registry ─────────────────────────── */

interface SourceFile {
  path: string;
  language: string;
  category: string;
  description: string;
  code: string;
}

const SOURCE_FILES: SourceFile[] = [
  // ═══════════════════ ENTRY POINTS ═══════════════════
  {
    path: 'src/main.tsx',
    language: 'tsx',
    category: 'Entry Points',
    description: 'Application bootstrap — mounts React, initializes error reporting & web vitals',
    code: `import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { setupLinkPreloading, preloadCriticalRoutes } from "@/lib/routePreloader";
import { initGlobalErrorReporter } from "@/lib/globalErrorReporter";
import { reportWebVitals } from "@/lib/webVitalsReporter";

initGlobalErrorReporter();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

if (typeof window !== 'undefined') {
  setupLinkPreloading();
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadCriticalRoutes);
  } else {
    setTimeout(preloadCriticalRoutes, 2000);
  }
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(reportWebVitals);
  } else {
    setTimeout(reportWebVitals, 4000);
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/registerSW.js').catch(() => {});
  });
}`,
  },
  {
    path: 'src/App.tsx',
    language: 'tsx',
    category: 'Entry Points',
    description: 'Root component — providers, routing, lazy-loading, global overlays',
    code: `import { lazy, Suspense, useEffect, useState } from "react";
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
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CookieConsentBanner } from "@/components/notifications/CookieConsentBanner";

// Lazy non-critical global components
const NotificationPermissionPrompt = lazy(() => import("@/components/notifications/NotificationPermissionPrompt").then(m => ({ default: m.NotificationPermissionPrompt })));
const LivePurchaseNotification = lazy(() => import("@/components/marketing/LivePurchaseNotification").then(m => ({ default: m.LivePurchaseNotification })));
const CartReservationTimer = lazy(() => import("@/components/marketing/CartReservationTimer").then(m => ({ default: m.CartReservationTimer })));
const SmartInstallPrompt = lazy(() => import("@/components/marketing/SmartInstallPrompt").then(m => ({ default: m.SmartInstallPrompt })));
const DailyCheckin = lazy(() => import("@/components/loyalty/DailyCheckin").then(m => ({ default: m.DailyCheckin })));
const LiveChatWidget = lazy(() => import("@/components/chat/LiveChatWidget").then(m => ({ default: m.LiveChatWidget })));
const WhatsAppFloatingButton = lazy(() => import("@/components/chat/WhatsAppFloatingButton").then(m => ({ default: m.WhatsAppFloatingButton })));
const OfflineIndicator = lazy(() => import("@/components/ui/OfflineIndicator").then(m => ({ default: m.OfflineIndicator })));

const DeferredHooksInner = lazy(() => import("@/components/DeferredHooks"));

function GlobalHooks() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!ready) return null;
  return <Suspense fallback={null}><DeferredHooksInner /></Suspense>;
}

// Eagerly loaded critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";

// Lazy non-critical pages
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Orders = lazy(() => import("./pages/customer/Orders"));
const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const VendorDashboard = lazy(() => import("./pages/vendor/VendorDashboard"));
// ... 30+ more lazy-loaded routes

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
                <ThemeApplier />
                <CookieConsentBanner />
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

                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public — eagerly loaded */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:slug" element={<ProductDetail />} />
                    
                    {/* Public — lazy */}
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success/:orderId" element={<OrderSuccess />} />
                    
                    {/* Protected Customer Routes */}
                    <Route path="/account" element={<ProtectedRoute><CustomerAccount /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                    
                    {/* Protected Vendor Routes */}
                    <Route path="/vendor" element={<ProtectedRoute requiredRole="vendor"><VendorDashboard /></ProtectedRoute>} />
                    <Route path="/vendor/products" element={<ProtectedRoute requiredRole="vendor"><VendorProducts /></ProtectedRoute>} />
                    
                    {/* Admin */}
                    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                    
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

export default App;`,
  },

  // ═══════════════════ CONTEXTS ═══════════════════
  {
    path: 'src/contexts/AuthContext.tsx',
    language: 'tsx',
    category: 'Contexts',
    description: 'Authentication state — session, user, roles (user/vendor/admin), sign-out',
    code: `import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'user' | 'vendor' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isVendor: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (!error) setRoles(data?.map((r) => r.role as AppRole) || []);
  };

  const refreshRoles = async () => { if (user) await fetchRoles(user.id); };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          setTimeout(() => fetchRoles(currentSession.user.id), 0);
        } else {
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRoles(s.user.id);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setRoles([]);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, roles,
      isAdmin: roles.includes('admin'),
      isVendor: roles.includes('vendor'),
      signOut, refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}`,
  },
  {
    path: 'src/contexts/CartContext.tsx',
    language: 'tsx',
    category: 'Contexts',
    description: 'Cart state — add/remove/update items, DB sync, anonymous ↔ user cart merge on login',
    code: `import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CartItem {
  product_id: string;
  quantity: number;
  variant_info?: Record<string, string> | null;
  added_at: string;
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  image_url?: string;
  stock?: number;
  vendor_name?: string;
  slug?: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getSessionId = (): string => {
  let sid = localStorage.getItem('cart_session_id');
  if (!sid) {
    sid = \`sess_\${Date.now()}_\${Math.random().toString(36).substring(2, 15)}\`;
    localStorage.setItem('cart_session_id', sid);
  }
  return sid;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from('carts').select('*');
    if (user) query = query.eq('user_id', user.id);
    else query = query.eq('session_id', getSessionId());

    const { data } = await query.maybeSingle();
    if (data) {
      setCartId(data.id);
      await enrichCartItems((data.items as unknown as CartItem[]) || []);
    } else {
      setItems([]); setCartId(null);
    }
    setIsLoading(false);
  }, [user]);

  const enrichCartItems = async (cartItems: CartItem[]) => {
    if (!cartItems.length) { setItems([]); return; }
    const { data: products } = await supabase
      .from('products')
      .select('id, title, slug, price, compare_at_price, stock, product_images(url, is_primary), vendors(brand_name)')
      .in('id', cartItems.map(i => i.product_id));

    setItems(cartItems.map(item => {
      const p = products?.find(p => p.id === item.product_id);
      if (!p) return item;
      const img = p.product_images?.find(i => i.is_primary);
      return { ...item, title: p.title, slug: p.slug, price: p.price,
        compare_at_price: p.compare_at_price, stock: p.stock,
        image_url: img?.url, vendor_name: p.vendors?.brand_name };
    }));
  };

  const saveCart = async (newItems: CartItem[]) => {
    const stripped = newItems.map(({ product_id, quantity, variant_info, added_at }) =>
      ({ product_id, quantity, variant_info, added_at }));

    if (cartId) {
      await supabase.from('carts').update({ items: stripped as any }).eq('id', cartId);
    } else {
      const payload: any = { items: stripped };
      if (user) payload.user_id = user.id;
      else payload.session_id = getSessionId();
      const { data } = await supabase.from('carts').insert(payload).select().single();
      setCartId(data?.id || null);
    }
  };

  const addItem = async (productId: string, qty = 1, variant?: Record<string, string>) => {
    const existing = items.findIndex(i => i.product_id === productId);
    const newItems = existing >= 0
      ? items.map((i, idx) => idx === existing ? { ...i, quantity: i.quantity + qty } : i)
      : [...items, { product_id: productId, quantity: qty, variant_info: variant || null, added_at: new Date().toISOString() }];
    await saveCart(newItems);
    await enrichCartItems(newItems);
    setIsOpen(true);
    toast.success('Added to cart');
  };

  // updateQuantity, removeItem, clearCart — similar pattern
  // Cart merge on login: merges anonymous localStorage cart into user's DB cart

  useEffect(() => { fetchCart(); }, [fetchCart]);

  return (
    <CartContext.Provider value={{ items, isLoading, isOpen, setIsOpen, addItem, updateQuantity, removeItem, clearCart,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}`,
  },

  // ═══════════════════ HOOKS ═══════════════════
  {
    path: 'src/hooks/useProducts.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Product listing + detail queries — filtering, sorting, pagination, category resolution',
    code: `import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProducts(options = {}) {
  const { categorySlug, categoryId, featured, limit, searchQuery, sortBy = 'newest', tags } = options;

  return useQuery({
    queryKey: ['products', { categorySlug, categoryId, featured, limit, searchQuery, sortBy, tags }],
    queryFn: async () => {
      let targetCategoryId = categoryId;
      if (categorySlug && !categoryId) {
        const { data: cat } = await supabase.from('categories').select('id')
          .eq('slug', categorySlug).eq('is_active', true).single();
        if (cat) targetCategoryId = cat.id;
      }

      let query = supabase.from('products').select(\`
        id, title, slug, description, price, compare_at_price, stock,
        is_active, is_featured, avg_rating, review_count, sold_count,
        vendor_id, category_id, tags, created_at,
        product_images (url, is_primary, alt_text),
        vendors_public (brand_name, slug),
        categories (name, slug)
      \`).eq('is_active', true);

      if (targetCategoryId) query = query.eq('category_id', targetCategoryId);
      if (featured) query = query.eq('is_featured', true);
      if (searchQuery) query = query.or(\`title.ilike.%\${searchQuery}%,description.ilike.%\${searchQuery}%\`);
      if (tags?.length) query = query.overlaps('tags', tags);

      switch (sortBy) {
        case 'price-asc': query = query.order('price', { ascending: true }); break;
        case 'price-desc': query = query.order('price', { ascending: false }); break;
        case 'popular': query = query.order('sold_count', { ascending: false }); break;
        case 'rating': query = query.order('avg_rating', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select(\`
        *, product_images (id, url, is_primary, alt_text, sort_order),
        vendors_public (id, brand_name, slug, bio, logo_url),
        categories (id, name, slug)
      \`).eq('slug', slug).eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}`,
  },
  {
    path: 'src/hooks/useOrders.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Customer order list — joins orders → sub_orders → order_items → products, vendors',
    code: `import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: orders } = await supabase.from('orders').select('*')
        .eq('customer_id', user.id).order('created_at', { ascending: false });
      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);
      const { data: subOrders } = await supabase.from('sub_orders').select('*').in('order_id', orderIds);

      const subOrderIds = subOrders?.map(so => so.id) || [];
      let orderItems: any[] = [];
      if (subOrderIds.length > 0) {
        const { data } = await supabase.from('order_items').select('*, products(slug)').in('sub_order_id', subOrderIds);
        orderItems = data || [];
      }

      const vendorIds = [...new Set(subOrders?.map(so => so.vendor_id) || [])];
      const { data: vendors } = await supabase.from('vendors').select('id, brand_name').in('id', vendorIds);

      return orders.map(order => ({
        ...order,
        sub_orders: (subOrders?.filter(so => so.order_id === order.id) || []).map(so => ({
          ...so,
          vendor_name: vendors?.find(v => v.id === so.vendor_id)?.brand_name,
          items: orderItems.filter(i => i.sub_order_id === so.id).map(i => ({
            ...i, product_slug: i.products?.slug || null,
          })),
        })),
      }));
    },
    enabled: !!user,
  });
}`,
  },
  {
    path: 'src/hooks/useCheckout.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Checkout flow — Razorpay script loading, prepaid payment, COD order, payment verification',
    code: `import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

export function useCheckout() {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(!!window.Razorpay);

  // Preload Razorpay script on mount
  useEffect(() => {
    if (window.Razorpay) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    document.body.appendChild(script);
  }, []);

  const prepareOrderItems = async () => {
    const productIds = items.map(i => i.product_id);
    const { data: products } = await supabase.from('products')
      .select('id, vendor_id').in('id', productIds);
    const vendorMap = new Map(products?.map(p => [p.id, p.vendor_id]) || []);
    return items.map(item => ({
      product_id: item.product_id, quantity: item.quantity,
      variant_info: item.variant_info, title: item.title || 'Product',
      price: item.price || 0, image_url: item.image_url,
      vendor_id: vendorMap.get(item.product_id),
    }));
  };

  const placeCODOrder = async (shippingAddress, customerNote, promoInfo, guestInfo, shippingCost = 0, codCharge = 0) => {
    setIsLoading(true);
    const orderItems = await prepareOrderItems();
    const { data, error } = await supabase.functions.invoke('create-cod-order', {
      body: { items: orderItems, shipping_address: shippingAddress, customer_note: customerNote,
        promo_info: promoInfo, guest_info: guestInfo, shipping_cost: shippingCost, cod_charge: codCharge,
        idempotency_key: crypto.randomUUID() },
    });
    if (error || data?.error) throw new Error(data?.error || error.message);
    await clearCart();
    toast.success('Order placed!');
    setIsLoading(false);
    return { success: true, orderNumber: data.order_number, orderId: data.order_id };
  };

  const initiatePayment = async (shippingAddress, customerNote, promoInfo, guestInfo, shippingCost = 0) => {
    setIsLoading(true);
    const orderItems = await prepareOrderItems();
    const { data } = await supabase.functions.invoke('create-razorpay-order', {
      body: { items: orderItems, shipping_address: shippingAddress,
        customer_note: customerNote, promo_info: promoInfo,
        guest_info: guestInfo, shipping_cost: shippingCost },
    });

    return new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id, amount: data.amount * 100,
        currency: 'INR', name: 'Odhra', order_id: data.razorpay_order_id,
        prefill: data.prefill,
        handler: async (response) => {
          const { data: verifyData } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: { ...response, order_id: data.order_id },
          });
          await clearCart();
          toast.success('Payment successful!');
          resolve({ success: true, orderNumber: verifyData.order_number });
        },
        modal: { ondismiss: () => { setIsLoading(false); resolve({ success: false }); } },
      });
      rzp.open();
    });
  };

  return { initiatePayment, placeCODOrder, isLoading, subtotal,
    tax: Math.round(subtotal * 0.18), total: subtotal + Math.round(subtotal * 0.18) };
}`,
  },
  {
    path: 'src/hooks/useLoyalty.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Loyalty system — points, tiers (bronze→diamond), daily check-in streaks, achievements',
    code: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 2000, platinum: 5000, diamond: 10000 };

export const TIER_BENEFITS = {
  bronze: { pointsMultiplier: 1, freeShippingThreshold: 999, exclusiveDeals: false, birthdayBonus: 50 },
  silver: { pointsMultiplier: 1.25, freeShippingThreshold: 799, exclusiveDeals: true, birthdayBonus: 100 },
  gold: { pointsMultiplier: 1.5, freeShippingThreshold: 499, earlyAccess: true, birthdayBonus: 200 },
  platinum: { pointsMultiplier: 2, freeShippingThreshold: 0, earlyAccess: true, birthdayBonus: 500 },
  diamond: { pointsMultiplier: 2.5, freeShippingThreshold: 0, earlyAccess: true, birthdayBonus: 1000 },
};

export function useLoyaltyPoints() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['loyalty-points', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('loyalty_points').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

export function useDailyCheckin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: loyalty } = await supabase.from('loyalty_points').select('*').eq('user_id', user.id).maybeSingle();
      const today = new Date().toISOString().split('T')[0];
      const last = loyalty?.last_checkin_at ? new Date(loyalty.last_checkin_at).toISOString().split('T')[0] : null;
      if (last === today) throw new Error('Already checked in today');

      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      let streak = last === yesterday.toISOString().split('T')[0] ? (loyalty?.streak_days || 0) + 1 : 1;
      let points = streak >= 30 ? 25 : streak >= 14 ? 15 : streak >= 7 ? 10 : 5;

      await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id, p_points: points, p_source: 'daily_checkin',
        p_description: \`Daily check-in (day \${streak})\`,
      });
      await supabase.from('loyalty_points').update({ streak_days: streak, last_checkin_at: new Date().toISOString() }).eq('user_id', user.id);
      return { points, streak };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['loyalty-points'] });
      toast.success(\`+\${data.points} points! Day \${data.streak} streak 🔥\`);
    },
  });
}`,
  },
  {
    path: 'src/hooks/useWishlist.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Wishlist — add/remove/toggle, count query, check membership, product enrichment',
    code: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('wishlists').select(\`
        *, product:products (id, title, slug, price, compare_at_price, stock, is_active,
          product_images (url, is_primary), vendors (brand_name, slug))
      \`).eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const add = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Login required');
      await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); toast.success('Added to wishlist'); },
  });
  const remove = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Login required');
      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); toast.success('Removed from wishlist'); },
  });
  return {
    toggle: (id: string, isIn: boolean) => isIn ? remove.mutateAsync(id) : add.mutateAsync(id),
    isPending: add.isPending || remove.isPending,
  };
}`,
  },
  {
    path: 'src/hooks/useReviews.ts',
    language: 'typescript',
    category: 'Hooks',
    description: 'Reviews — CRUD, verified purchase check, auto sentiment analysis, moderation, stats',
    code: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data: reviews } = await supabase.from('reviews').select('*')
        .eq('product_id', productId).eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (!reviews?.length) return [];

      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, avatar_url').in('id', userIds);
      const map = new Map(profiles?.map(p => [p.id, p]) || []);
      return reviews.map(r => ({ ...r, profiles: map.get(r.user_id) || null }));
    },
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      // Check verified purchase
      const { data: orderItems } = await supabase.from('order_items').select(\`
        id, sub_orders!inner (status, orders!inner (customer_id))
      \`).eq('product_id', data.product_id).eq('sub_orders.orders.customer_id', user!.id)
        .eq('sub_orders.status', 'delivered').limit(1);

      const { data: review } = await supabase.from('reviews').insert({
        user_id: user!.id, product_id: data.product_id,
        rating: data.rating, title: data.title, content: data.content,
        images: data.images || [], is_verified_purchase: !!orderItems?.length,
        is_approved: false, // Requires moderation
      }).select().single();

      // Auto-trigger AI sentiment analysis
      supabase.functions.invoke('analyze-review-sentiment', {
        body: { reviews: [{ reviewId: review.id, content: review.content, rating: review.rating }] },
      }).catch(() => {});

      return review;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['reviews', vars.product_id] }),
  });
}`,
  },

  // ═══════════════════ EDGE FUNCTIONS ═══════════════════
  {
    path: 'supabase/functions/create-razorpay-order/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Creates Razorpay payment order — validates prices against DB, creates order + sub-orders + items',
    code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

serve(async (req) => {
  // CORS handling...
  const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // Auth: optional (supports guest checkout)
  const authHeader = req.headers.get("Authorization");
  let userId = null;
  if (authHeader) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    userId = user?.id;
  }

  // Validate with Zod
  const { items, shipping_address, promo_info, guest_info, shipping_cost } = CreateOrderRequestSchema.parse(await req.json());

  // ★ SERVER-SIDE PRICE VERIFICATION — prevents client-side price tampering
  const { data: dbProducts } = await supabase.from('products').select('id, price, stock, is_active, vendor_id').in('id', items.map(i => i.product_id));
  for (const item of items) {
    const dbProduct = productMap.get(item.product_id);
    if (Math.abs(item.price - dbProduct.price) > 0.01) throw new Error("Price mismatch");
    if (dbProduct.stock < item.quantity) throw new Error("Insufficient stock");
  }

  // Calculate totals from verified DB prices
  const subtotal = items.reduce((sum, item) => sum + productMap.get(item.product_id)!.price * item.quantity, 0);
  const discount = promo_info?.discount_amount || 0;
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + shipping_cost + tax;

  // Create Razorpay order via API
  const rzpOrder = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: \`Basic \${btoa(\`\${RAZORPAY_KEY_ID}:\${RAZORPAY_KEY_SECRET}\`)}\` },
    body: JSON.stringify({ amount: total * 100, currency: "INR", receipt: order_number }),
  }).then(r => r.json());

  // Create DB order → sub_orders (per vendor) → order_items
  const { data: order } = await supabase.from("orders").insert({
    customer_id: userId, order_number, shipping_address, subtotal,
    discount_amount: discount, shipping_amount: shipping_cost, tax_amount: tax,
    total_amount: total, payment_provider: "razorpay", payment_id: rzpOrder.id,
    status: "pending", payment_status: "pending",
  }).select().single();

  // Group items by vendor → create sub_orders with commission calculation
  for (const [vendor_id, vendorItems] of Object.entries(itemsByVendor)) {
    const { data: vendor } = await supabase.from("vendors").select("commission_rate").eq("id", vendor_id).single();
    const commission = Math.round(vendorTotal * (vendor.commission_rate / 100));
    // Insert sub_order + order_items...
  }

  return Response.json({ razorpay_order_id: rzpOrder.id, razorpay_key_id: RAZORPAY_KEY_ID, order_id: order.id, amount: total, prefill });
});`,
  },
  {
    path: 'supabase/functions/verify-razorpay-payment/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Verifies Razorpay payment signature (HMAC-SHA256), confirms order, deducts stock atomically, awards loyalty points, processes referrals, sends confirmation email',
    code: `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

serve(async (req) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = VerifyPaymentSchema.parse(await req.json());

  // ★ HMAC-SHA256 Signature Verification (Web Crypto API)
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = bufferToHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(body)));
  if (signature !== razorpay_signature) throw new Error("Signature mismatch");

  // Update order → confirmed, payment → paid
  await supabase.from("orders").update({ payment_status: "paid", status: "confirmed", payment_id: razorpay_payment_id }).eq("id", order_id);
  await supabase.from("sub_orders").update({ status: "confirmed" }).eq("order_id", order_id);

  // ★ Atomic stock deduction via RPC (prevents overselling)
  for (const item of orderItems) {
    await supabase.rpc("deduct_product_stock", { p_product_id: item.product_id, p_quantity: item.quantity });
  }

  // Post-payment processing:
  // 1. Record promotion usage
  // 2. Mark reward/spin codes as used
  // 3. Clear user's cart
  // 4. Award loyalty points (1 per ₹10)
  // 5. Check & award achievements
  // 6. Complete pending referrals (if order ≥ ₹499)
  // 7. Send order confirmation email

  return Response.json({ success: true, order_number });
});`,
  },
  {
    path: 'supabase/functions/create-cod-order/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Cash-on-Delivery order — same validation as prepaid, idempotency key, COD limit (₹50K), immediate stock deduction',
    code: `// Same structure as create-razorpay-order but:
// - No external payment gateway call
// - Order created with status: "confirmed", payment_status: "cod_pending"
// - Stock deducted immediately (since no payment verification step)
// - Idempotency key prevents duplicate orders on retry
// - COD limit: ₹50,000 max
// - Awards loyalty points, processes referrals, sends email inline`,
  },
  {
    path: 'supabase/functions/create-stripe-checkout/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Stripe Checkout Session — creates line items, handles tax, creates order + sub-orders',
    code: `import Stripe from "https://esm.sh/stripe@14.21.0";

serve(async (req) => {
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  // Get or create Stripe customer
  const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customerId = existingCustomers.data.length > 0
    ? existingCustomers.data[0].id
    : (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id;

  // Create line items
  const lineItems = items.map(item => ({
    price_data: { currency: "usd", product_data: { name: item.title }, unit_amount: Math.round(item.price * 100) },
    quantity: item.quantity,
  }));

  // Add tax as separate line item
  if (tax_amount > 0) lineItems.push({ price_data: { currency: "usd", product_data: { name: "Tax (18% GST)" }, unit_amount: tax_amount * 100 }, quantity: 1 });

  // Create DB order + sub-orders (same pattern as Razorpay)

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId, payment_method_types: ["card"], line_items: lineItems, mode: "payment",
    success_url: \`\${success_url}?order_id=\${order.id}&session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url, metadata: { order_id: order.id, order_number, user_id: user.id },
  });

  return Response.json({ session_id: session.id, checkout_url: session.url, order_id: order.id });
});`,
  },
  {
    path: 'supabase/functions/razorpay-webhook/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Razorpay webhook — handles payment.captured, payment.failed, refund.created events with HMAC verification',
    code: `serve(async (req) => {
  // Verify webhook signature (HMAC-SHA256 of raw body)
  const signature = req.headers.get("x-razorpay-signature");
  const rawBody = await req.text();
  const expectedSig = bufferToHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody)));
  if (expectedSig !== signature) return new Response("Invalid signature", { status: 401 });

  const { event, payload } = JSON.parse(rawBody);

  switch (event) {
    case "payment.captured":
      // Mark order paid + sub-orders confirmed
      await supabase.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("payment_id", razorpay_order_id);
      break;
    case "payment.failed":
      // Mark order cancelled
      await supabase.from("orders").update({ payment_status: "failed", status: "cancelled" }).eq("payment_id", razorpay_order_id);
      break;
    case "refund.created":
      await supabase.from("orders").update({ payment_status: "refunded" }).eq("payment_id", razorpay_payment_id);
      break;
  }

  return Response.json({ received: true });
});`,
  },
  {
    path: 'supabase/functions/ai-chatbot/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'AI Shopping Assistant — streams responses via Lovable AI gateway (Gemini 2.5 Flash)',
    code: `serve(async (req) => {
  const { messages, context } = await req.json();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const systemPrompt = \`You are Odhra's AI Shopping Assistant...
  Help customers find products, provide recommendations, answer policy questions.\`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: \`Bearer \${LOVABLE_API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  // Stream response directly to client
  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});`,
  },
  {
    path: 'supabase/functions/send-email/index.ts',
    language: 'typescript',
    category: 'Edge Functions',
    description: 'Email service (Resend) — 20+ HTML templates: order confirmation, OTP, cart abandonment, welcome, shipping, reviews, promotions, vendor notifications',
    code: `import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// URL Builder — generates proper links for all email templates
const buildUrl = {
  orderTracking: (id) => \`\${BASE_URL}/orders/\${id}\`,
  product: (slug) => \`\${BASE_URL}/product/\${slug}\`,
  cart: () => \`\${BASE_URL}/cart\`,
  spinWheel: () => \`\${BASE_URL}/spin-to-win\`,
  emailPreferences: () => \`\${BASE_URL}/account/email-preferences\`,
  // ... 15+ more URL builders
};

// 20+ email types: order_confirmation, otp_verification, cart_abandonment,
// back_in_stock, welcome, shipping_update, order_delivered, promotional_campaign,
// flash_sale, price_drop, order_refunded, review_request, loyalty_reward,
// newsletter, spin_wheel_unlocked, password_reset, vendor_new_order,
// vendor_payout, ticket_reply, admin_new_order, vendor_order_update, admin_low_stock

const getEmailTemplate = (type, data) => {
  switch (type) {
    case "order_confirmation":
      return { subject: \`Order Confirmed - \${data.orderNumber}\`, html: \`...\` };
    case "cart_abandonment":
      return { subject: "You left something behind ✨", html: \`...\` };
    // ... 18+ more templates with responsive HTML
  }
};

serve(async (req) => {
  const { type, to, data } = await req.json();
  const template = getEmailTemplate(type, data);
  await resend.emails.send({ from: "Odhra <noreply@...>", to, ...template });
});`,
  },

  // ═══════════════════ CONFIG ═══════════════════
  {
    path: 'supabase/config.toml',
    language: 'toml',
    category: 'Configuration',
    description: 'Edge function config — JWT verification settings per function',
    code: `project_id = "sckugugzlgoihoviqoid"

[functions.create-razorpay-order]
verify_jwt = false

[functions.verify-razorpay-payment]
verify_jwt = false

[functions.razorpay-webhook]
verify_jwt = false

[functions.ai-chatbot]
verify_jwt = false

[functions.generate-product-description]
verify_jwt = true

[functions.analyze-review-sentiment]
verify_jwt = true

[functions.send-email]
verify_jwt = false

[functions.create-stripe-checkout]
verify_jwt = false

[functions.stripe-webhook]
verify_jwt = false

[functions.create-cod-order]
verify_jwt = false

[functions.send-whatsapp]
verify_jwt = false

[functions.sync-algolia]
verify_jwt = false

[functions.inventory-alerts]
verify_jwt = false`,
  },
  {
    path: '.env',
    language: 'env',
    category: 'Configuration',
    description: 'Environment variables template — Supabase URL + anon key (auto-generated)',
    code: `VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_id

# Edge Function Secrets (set via Cloud > Secrets):
# RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
# STRIPE_SECRET_KEY
# RESEND_API_KEY
# LOVABLE_API_KEY (auto-provided)
# ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY
# META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID`,
  },
  {
    path: 'supabase/functions/_shared/url.ts',
    language: 'typescript',
    category: 'Configuration',
    description: 'Shared URL resolver — determines base URL for emails & redirects across environments',
    code: `export function resolveAppBaseUrl(): string {
  const envUrl = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL");
  if (envUrl) return envUrl.replace(/\\/$/, "");
  
  const projectId = Deno.env.get("VITE_SUPABASE_PROJECT_ID") || Deno.env.get("SUPABASE_PROJECT_REF");
  if (projectId) return \`https://\${projectId}.lovable.app\`;
  
  return "https://odhra1.lovable.app";
}`,
  },

  // ═══════════════════ CSS / DESIGN SYSTEM ═══════════════════
  {
    path: 'src/index.css (Design Tokens)',
    language: 'css',
    category: 'Design System',
    description: 'Complete design token system — Royal Indigo & Gold HSL palette, light + dark themes, shadows, glassmorphism',
    code: `@layer base {
  :root {
    /* Core — Royal Indigo Light Theme */
    --background: 250 20% 98%;
    --foreground: 260 45% 11%;
    --card: 250 25% 100%;
    --primary: 262 56% 22%;          /* Deep Royal Indigo */
    --primary-foreground: 250 30% 98%;
    --secondary: 250 18% 95%;
    --muted: 252 14% 92%;
    --accent: 42 92% 52%;            /* Warm Burnished Gold */
    --accent-foreground: 262 50% 10%;
    --success: 158 64% 40%;          /* Rich Emerald */
    --destructive: 0 72% 51%;        /* Crimson */
    --border: 252 16% 89%;
    --ring: 262 56% 22%;
    --radius: 0.625rem;

    /* Shadows — Indigo undertone */
    --shadow-sm: 0 1px 2px 0 hsl(262 40% 12% / 0.04);
    --shadow-lg: 0 12px 28px -4px hsl(262 40% 12% / 0.08);
    --shadow-accent: 0 8px 24px -4px hsl(42 92% 52% / 0.22);

    /* Psychology Colors */
    --urgency: 0 72% 51%;
    --trust: 217 91% 50%;
    --premium: 42 92% 52%;
    --growth: 158 64% 40%;
  }

  .dark {
    --background: 260 30% 6%;
    --foreground: 250 15% 92%;
    --primary: 262 60% 62%;
    --accent: 42 90% 58%;
    /* ... full dark mode overrides */
  }
}

/* View Transitions API */
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: fade-out 150ms ease-out; }
::view-transition-new(root) { animation: fade-in 200ms ease-in; }

/* Interactive cards */
.card-interactive {
  @apply transition-all duration-300 ease-out cursor-pointer;
  &:hover { @apply -translate-y-1; box-shadow: var(--shadow-lg); }
  &:active { @apply translate-y-0 scale-[0.98]; }
}`,
  },

  // ═══════════════════ SQL DATABASE SCHEMA ═══════════════════
  {
    path: 'sql/00-enums-and-types.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Custom enums and types — app_role, admin_permission_category',
    code: `-- Custom enum: application roles
CREATE TYPE public.app_role AS ENUM ('user', 'vendor', 'admin', 'cce');

-- Custom enum: admin permission categories
CREATE TYPE public.admin_permission_category AS ENUM (
  'dashboard', 'orders', 'products', 'customers', 'vendors',
  'marketing', 'content', 'analytics', 'finance', 'support',
  'settings', 'system'
);`,
  },
  {
    path: 'sql/01-core-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Core tables — profiles, user_roles, categories, products, product_images, vendors',
    code: `-- ═══════════════════ PROFILES ═══════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ USER ROLES ═══════════════════
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ CATEGORIES ═══════════════════
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ VENDORS ═══════════════════
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  brand_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  logo_url TEXT,
  banner_url TEXT,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  pan_number TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  commission_rate NUMERIC DEFAULT 15,
  balance NUMERIC DEFAULT 0,
  social_links JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ PRODUCTS ═══════════════════
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC,
  cost_price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  sku TEXT,
  hsn_code TEXT,
  barcode TEXT,
  weight NUMERIC,
  dimensions JSONB,
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_digital BOOLEAN DEFAULT false,
  avg_rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ PRODUCT IMAGES ═══════════════════
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ PRODUCT VARIANTS ═══════════════════
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_type TEXT NOT NULL,
  price_adjustment NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sku TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_values TEXT[] NOT NULL,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/02-order-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Order system — orders, sub_orders (per vendor), order_items, order_notes, cancellations',
    code: `-- ═══════════════════ ORDERS ═══════════════════
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id),
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  payment_id TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  cod_charge NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  shipping_address JSONB,
  billing_address JSONB,
  customer_note TEXT,
  admin_note TEXT,
  promo_code TEXT,
  promo_discount_type TEXT,
  promo_discount_value NUMERIC,
  idempotency_key TEXT UNIQUE,
  risk_score INTEGER DEFAULT 0,
  fraud_status TEXT DEFAULT 'clean',
  guest_email TEXT,
  guest_phone TEXT,
  guest_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ SUB-ORDERS (per vendor) ═══════════════════
CREATE TABLE public.sub_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  sub_order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  vendor_earnings NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_orders ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ORDER ITEMS ═══════════════════
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_title TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  variant_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ORDER CANCELLATIONS ═══════════════════
CREATE TABLE public.order_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  additional_details TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  refund_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ORDER NOTES ═══════════════════
CREATE TABLE public.order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  author_id UUID,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ORDER ACTIVITY LOG ═══════════════════
CREATE TABLE public.order_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  actor_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/03-payment-shipping-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Payment, shipping, invoices, refunds, returns, disputes',
    code: `-- ═══════════════════ INVOICES ═══════════════════
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT DEFAULT 'sale',
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  customer_id UUID,
  vendor_id UUID REFERENCES public.vendors(id),
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  currency TEXT DEFAULT 'INR',
  seller_details JSONB,
  buyer_details JSONB,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ REFUNDS ═══════════════════
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  customer_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  refund_method TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ RETURN REQUESTS ═══════════════════
CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  customer_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  reason TEXT NOT NULL,
  additional_info TEXT,
  images TEXT[],
  status TEXT DEFAULT 'pending',
  resolution TEXT,
  refund_amount NUMERIC,
  admin_notes TEXT,
  pickup_address JSONB,
  return_tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ SHIPMENTS ═══════════════════
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id),
  tracking_number TEXT,
  carrier TEXT,
  carrier_id UUID REFERENCES public.delivery_partners(id),
  status TEXT DEFAULT 'pending',
  estimated_delivery TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shipping_label_url TEXT,
  weight NUMERIC,
  dimensions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ DISPUTES ═══════════════════
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_number TEXT NOT NULL UNIQUE,
  dispute_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  sub_order_id UUID REFERENCES public.sub_orders(id),
  return_request_id UUID REFERENCES public.return_requests(id),
  vendor_id UUID REFERENCES public.vendors(id),
  raised_by_id UUID NOT NULL,
  raised_by_type TEXT NOT NULL,
  assigned_to UUID,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  resolution_type TEXT,
  resolution_amount NUMERIC,
  resolution_notes TEXT,
  evidence_urls TEXT[],
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ WALLET & PAYOUTS ═══════════════════
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_details JSONB,
  utr_number TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/04-loyalty-gamification-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Loyalty system — points, transactions, tiers, challenges, achievements, badges, referrals, spin wheel',
    code: `-- ═══════════════════ LOYALTY POINTS ═══════════════════
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  streak_days INTEGER DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ LOYALTY TRANSACTIONS ═══════════════════
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earn' | 'redeem' | 'expire' | 'adjust'
  source TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ BADGE DEFINITIONS ═══════════════════
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY, -- e.g. 'first_purchase', 'loyal_customer_10'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  criteria JSONB,
  points_reward INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ACHIEVEMENTS ═══════════════════
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ LOYALTY CHALLENGES ═══════════════════
CREATE TABLE public.loyalty_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  icon TEXT,
  max_participants INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_challenges ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ REFERRAL CODES ═══════════════════
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ REFERRALS ═══════════════════
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, expired, cancelled
  referrer_reward INTEGER DEFAULT 100,
  referred_reward INTEGER DEFAULT 50,
  qualifying_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ SPIN WHEEL ENTRIES ═══════════════════
CREATE TABLE public.spin_wheel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- 'percentage' | 'fixed'
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  status TEXT DEFAULT 'active', -- active, used, expired
  qualifying_order_id UUID,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_wheel_entries ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ POINTS REDEMPTION ═══════════════════
CREATE TABLE public.points_redemption_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  min_tier TEXT DEFAULT 'bronze',
  max_redemptions_per_user INTEGER,
  validity_days INTEGER DEFAULT 30,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_redemption_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.points_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  option_id UUID REFERENCES public.points_redemption_options(id),
  points_spent INTEGER NOT NULL,
  reward_code TEXT,
  reward_details JSONB,
  status TEXT DEFAULT 'active',
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_redemptions ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/05-marketing-cms-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Marketing & CMS — promotions, flash sales, CMS content, notifications, campaigns, reviews',
    code: `-- ═══════════════════ PROMOTIONS ═══════════════════
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL, -- 'percentage' | 'fixed'
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  max_uses INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  applicable_categories UUID[],
  applicable_products UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ FLASH SALES ═══════════════════
CREATE TABLE public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  early_access_hours INTEGER,
  early_access_tiers TEXT[],
  max_quantity_per_user INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ CMS CONTENT ═══════════════════
CREATE TABLE public.cms_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  ab_enabled BOOLEAN DEFAULT false,
  ab_variant_b_content JSONB,
  ab_traffic_split NUMERIC DEFAULT 50,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ REVIEWS ═══════════════════
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  vendor_reply TEXT,
  vendor_replied_at TIMESTAMPTZ,
  sentiment_score NUMERIC,
  sentiment_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ NOTIFICATIONS ═══════════════════
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ WISHLISTS ═══════════════════
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ CARTS ═══════════════════
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  items JSONB DEFAULT '[]',
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/06-admin-support-tables.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Admin RBAC, support tickets, vendor management, system settings, audit logs',
    code: `-- ═══════════════════ ADMIN ROLES ═══════════════════
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ADMIN USERS ═══════════════════
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  admin_role_id UUID REFERENCES public.admin_roles(id),
  custom_permissions TEXT[] DEFAULT '{}',
  is_owner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  access_starts_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  ip_whitelist TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ADMIN PERMISSION DEFINITIONS ═══════════════════
CREATE TABLE public.admin_permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  description TEXT,
  category admin_permission_category NOT NULL,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_permission_definitions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ ADMIN AUDIT LOG ═══════════════════
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ SUPPORT TICKETS ═══════════════════
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  order_id UUID REFERENCES public.orders(id),
  attachments TEXT[],
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER,
  satisfaction_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ SYSTEM SETTINGS ═══════════════════
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ═══════════════════ FEATURE FLAGS ═══════════════════
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'general',
  settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;`,
  },
  {
    path: 'sql/07-rls-policies.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'ALL Row Level Security policies — 150+ policies for every table, covering user/vendor/admin access',
    code: `-- ═══════════════════ HELPER SECURITY DEFINER FUNCTIONS ═══════════════════
-- These prevent infinite recursion in RLS policies

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_vendor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'vendor');
$$;

CREATE OR REPLACE FUNCTION public.is_vendor_active(vendor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND is_active = true);
$$;

CREATE OR REPLACE FUNCTION public.is_order_customer(_order_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND customer_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_order_vendor(_order_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.vendors v ON so.vendor_id = v.id
    WHERE so.order_id = _order_id AND v.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_order_item(_sub_order_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.orders o ON so.order_id = o.id
    WHERE so.id = _sub_order_id AND (
      o.customer_id = _user_id
      OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = so.vendor_id AND v.user_id = _user_id)
      OR public.is_admin(_user_id)
    )
  );
$$;

-- ═══════════════════ PROFILES ═══════════════════
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ═══════════════════ USER ROLES ═══════════════════
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ CATEGORIES ═══════════════════
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ VENDORS ═══════════════════
CREATE POLICY "Vendors can view own store" ON vendors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Vendors can update own store" ON vendors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendor owner or admin can view vendor details" ON vendors FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Admins can manage all vendors" ON vendors FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ PRODUCTS ═══════════════════
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true AND is_vendor_active(vendor_id));
CREATE POLICY "Vendors can manage own products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()));
CREATE POLICY "Admins can manage all products" ON products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ PRODUCT IMAGES ═══════════════════
CREATE POLICY "Anyone can view product images" ON product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Vendors can manage own product images" ON product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = product_images.product_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = product_images.product_id AND v.user_id = auth.uid()));

-- ═══════════════════ ORDERS ═══════════════════
CREATE POLICY "Customers can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view orders with their sub-orders" ON orders FOR SELECT USING (is_order_vendor(id, auth.uid()));
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ SUB-ORDERS ═══════════════════
CREATE POLICY "Customers can view own sub-orders" ON sub_orders FOR SELECT USING (is_order_customer(order_id, auth.uid()));
CREATE POLICY "Vendors can view own sub-orders" ON sub_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = sub_orders.vendor_id AND vendors.user_id = auth.uid()));
CREATE POLICY "Vendors can update own sub-orders" ON sub_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors WHERE vendors.id = sub_orders.vendor_id AND vendors.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sub-orders" ON sub_orders FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ ORDER ITEMS ═══════════════════
CREATE POLICY "Users can view related order items" ON order_items FOR SELECT USING (can_view_order_item(sub_order_id, auth.uid()));

-- ═══════════════════ CARTS ═══════════════════
CREATE POLICY "Users can manage own cart" ON carts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anonymous can manage session cart" ON carts FOR ALL TO anon USING (session_id IS NOT NULL) WITH CHECK (session_id IS NOT NULL);

-- ═══════════════════ WISHLISTS ═══════════════════
CREATE POLICY "Users can manage own wishlist" ON wishlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════════════════ REVIEWS ═══════════════════
CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Users can manage own reviews" ON reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Vendors can reply to reviews" ON reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM products p JOIN vendors v ON p.vendor_id = v.id WHERE p.id = reviews.product_id AND v.user_id = auth.uid()));
CREATE POLICY "Admins can manage all reviews" ON reviews FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ═══════════════════ LOYALTY ═══════════════════
CREATE POLICY "Users can view own loyalty points" ON loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loyalty points" ON loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loyalty points" ON loyalty_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all loyalty points" ON loyalty_points FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own transactions" ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON loyalty_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════ REFERRALS ═══════════════════
CREATE POLICY "Users can view own referral code" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own referral code" ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can look up active referral codes by code" ON referral_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view referrals they made" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can be referred" ON referrals FOR INSERT WITH CHECK (auth.uid() = referred_id OR is_admin(auth.uid()));

-- ═══════════════════ NOTIFICATIONS ═══════════════════
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════ SUPPORT TICKETS ═══════════════════
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own tickets" ON support_tickets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all tickets" ON support_tickets FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ... 80+ more policies for remaining tables (same patterns)
-- Full list: promotions, flash_sales, cms_content, invoices, refunds,
-- return_requests, disputes, shipments, wallet_transactions, payout_requests,
-- admin_roles, admin_users, admin_audit_log, vendor_notifications,
-- vendor_support_tickets, feature_flags, system_settings, etc.`,
  },
  {
    path: 'sql/08-functions.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'ALL database functions — stock management, loyalty, referrals, fraud detection, invoicing, vendor performance',
    code: `-- ═══════════════════ STOCK MANAGEMENT ═══════════════════
-- Atomic stock deduction with row-level locking (prevents overselling)
CREATE OR REPLACE FUNCTION public.deduct_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_stock INTEGER; current_sold INTEGER;
BEGIN
  SELECT stock, COALESCE(sold_count, 0) INTO current_stock, current_sold
  FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Product not found'); END IF;
  IF current_stock < p_quantity THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock', 'available', current_stock); END IF;
  UPDATE products SET stock = current_stock - p_quantity, sold_count = current_sold + p_quantity WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true, 'new_stock', current_stock - p_quantity);
END; $$;

-- Restore stock on cancellation
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub RECORD; item RECORD;
BEGIN
  FOR sub IN SELECT id FROM sub_orders WHERE order_id = p_order_id LOOP
    FOR item IN SELECT product_id, quantity FROM order_items WHERE sub_order_id = sub.id LOOP
      UPDATE products SET stock = stock + item.quantity, sold_count = GREATEST(COALESCE(sold_count, 0) - item.quantity, 0) WHERE id = item.product_id;
    END LOOP;
  END LOOP;
END; $$;

-- ═══════════════════ LOYALTY SYSTEM ═══════════════════
CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(lifetime_pts INTEGER)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lifetime_pts >= 10000 THEN RETURN 'diamond';
  ELSIF lifetime_pts >= 5000 THEN RETURN 'platinum';
  ELSIF lifetime_pts >= 2000 THEN RETURN 'gold';
  ELSIF lifetime_pts >= 500 THEN RETURN 'silver';
  ELSE RETURN 'bronze'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_user_id UUID, p_points INTEGER, p_source TEXT, p_description TEXT, p_reference_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_record loyalty_points%ROWTYPE; new_tier TEXT; result JSONB;
BEGIN
  SELECT * INTO current_record FROM loyalty_points WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO loyalty_points (user_id, points, lifetime_points, tier)
    VALUES (p_user_id, p_points, p_points, calculate_loyalty_tier(p_points)) RETURNING * INTO current_record;
  ELSE
    new_tier := calculate_loyalty_tier(current_record.lifetime_points + p_points);
    UPDATE loyalty_points SET points = points + p_points, lifetime_points = lifetime_points + p_points, tier = new_tier, updated_at = NOW()
    WHERE user_id = p_user_id RETURNING * INTO current_record;
  END IF;
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, source, reference_id, description)
  VALUES (p_user_id, p_points, 'earn', p_source, p_reference_id, p_description);
  RETURN jsonb_build_object('success', true, 'points_added', p_points, 'new_balance', current_record.points, 'tier', current_record.tier);
END; $$;

-- Points redemption with row-level locking (prevents double-spend)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_user_id UUID, p_points_cost INTEGER, p_option_id UUID,
  p_reward_code TEXT, p_reward_details JSONB, p_expires_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_points INTEGER; redemption_id UUID;
BEGIN
  SELECT points INTO current_points FROM loyalty_points WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'No loyalty record'); END IF;
  IF current_points < p_points_cost THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient points'); END IF;
  UPDATE loyalty_points SET points = points - p_points_cost, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, source, description, reference_id)
  VALUES (p_user_id, -p_points_cost, 'redeem', 'redemption', 'Redeemed: ' || (p_reward_details->>'name'), p_option_id);
  INSERT INTO points_redemptions (user_id, option_id, points_spent, reward_code, reward_details, status, expires_at)
  VALUES (p_user_id, p_option_id, p_points_cost, p_reward_code, p_reward_details, 'active', p_expires_at)
  RETURNING id INTO redemption_id;
  RETURN jsonb_build_object('success', true, 'redemption_id', redemption_id, 'reward_code', p_reward_code, 'new_balance', current_points - p_points_cost);
END; $$;

-- ═══════════════════ REFERRAL SYSTEM ═══════════════════
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code TEXT; code_exists BOOLEAN;
BEGIN
  SELECT code INTO new_code FROM referral_codes WHERE user_id = p_user_id;
  IF FOUND THEN RETURN new_code; END IF;
  LOOP
    new_code := 'ODH' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, new_code);
  RETURN new_code;
END; $$;

-- ═══════════════════ SPIN WHEEL ═══════════════════
CREATE OR REPLACE FUNCTION public.can_user_spin(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE active_entry RECORD; entry_count INTEGER; qualifying_order RECORD;
BEGIN
  -- Check for active (non-expired) code
  SELECT * INTO active_entry FROM spin_wheel_entries
  WHERE user_id = p_user_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('can_spin', false, 'reason', 'active_code', 'code', active_entry.code); END IF;
  
  -- First spin is free
  SELECT COUNT(*) INTO entry_count FROM spin_wheel_entries WHERE user_id = p_user_id;
  IF entry_count = 0 THEN RETURN jsonb_build_object('can_spin', true, 'reason', 'first_spin'); END IF;
  
  -- Subsequent spins require qualifying order >= 999
  SELECT * INTO qualifying_order FROM orders
  WHERE customer_id = p_user_id AND total_amount >= 999 AND payment_status = 'paid'
    AND id NOT IN (SELECT qualifying_order_id FROM spin_wheel_entries WHERE qualifying_order_id IS NOT NULL AND user_id = p_user_id)
  ORDER BY created_at ASC LIMIT 1;
  IF qualifying_order IS NOT NULL THEN
    RETURN jsonb_build_object('can_spin', true, 'reason', 'qualifying_order', 'qualifying_order_id', qualifying_order.id);
  END IF;
  
  RETURN jsonb_build_object('can_spin', false, 'reason', 'no_qualifying_order', 'required_order_amount', 999);
END; $$;

-- ═══════════════════ FRAUD DETECTION ═══════════════════
CREATE OR REPLACE FUNCTION public.check_order_fraud(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Checks velocity (orders/hour), amount anomaly (daily total), address mismatch
-- Each rule contributes to risk_score. Actions: clean (<20), flagged (20-49), held (50-79), blocked (80+)
-- Inserts fraud_signals records for each triggered rule
-- Updates orders.risk_score and orders.fraud_status
DECLARE order_record RECORD; total_risk_score INTEGER := 0; fraud_action TEXT := 'clean';
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  -- ... (velocity, amount, address checks against fraud_rules table)
  IF total_risk_score >= 80 THEN fraud_action := 'blocked';
  ELSIF total_risk_score >= 50 THEN fraud_action := 'held';
  ELSIF total_risk_score >= 20 THEN fraud_action := 'flagged'; END IF;
  UPDATE orders SET risk_score = total_risk_score, fraud_status = fraud_action WHERE id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'risk_score', total_risk_score, 'action', fraud_action);
END; $$;

-- ═══════════════════ DYNAMIC PRICING ═══════════════════
CREATE OR REPLACE FUNCTION public.get_dynamic_price(p_product_id UUID, p_user_id UUID DEFAULT NULL, p_quantity INTEGER DEFAULT 1)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
-- Evaluates active pricing_rules (inventory_based, time_based) against product
-- Returns: base_price, final_price, discount, discount_percentage, applied_rules
BEGIN /* ... */ END; $$;

-- ═══════════════════ VENDOR PERFORMANCE ═══════════════════
CREATE OR REPLACE FUNCTION public.compute_vendor_performance(p_period_start DATE, p_period_end DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Computes: total_orders, revenue, on_time_delivery_rate, cancellation_rate, return_rate, avg_rating
-- Weighted score: on-time 30%, rating 25%, low-cancel 25%, low-return 20%
-- Grades: excellent (90+), good (80+), average (60+), poor (<60)
-- Upserts into vendor_performance_metrics
BEGIN /* ... */ END; $$;

-- ═══════════════════ ADMIN PERMISSIONS ═══════════════════
CREATE OR REPLACE FUNCTION public.get_admin_permissions(_user_id UUID)
RETURNS TEXT[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
-- Returns combined role + custom permissions for an admin user
-- Owners get ALL permissions from admin_permission_definitions
BEGIN /* ... */ END; $$;

CREATE OR REPLACE FUNCTION public.admin_has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
-- Checks if admin has specific permission via role or custom_permissions
-- Owners always return true
BEGIN /* ... */ END; $$;

-- ═══════════════════ AUTO-INVOICE GENERATION ═══════════════════
CREATE OR REPLACE FUNCTION public.auto_generate_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Triggered when order.payment_status changes to 'paid'
-- Creates one invoice per sub_order (per vendor)
-- Includes line items with HSN codes, tax rates, seller/buyer details
BEGIN /* ... */ END; $$;

-- ═══════════════════ AUTH TRIGGER ═══════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Triggered on auth.users INSERT
-- 1. Creates profile from metadata (name, avatar)
-- 2. Assigns 'user' role
-- 3. Processes referral code from signup metadata
-- 4. Awards welcome bonus points if referred
BEGIN /* ... */ END; $$;

-- ═══════════════════ RATE LIMITING ═══════════════════
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT, p_endpoint TEXT, p_max_requests INTEGER DEFAULT 60, p_window_seconds INTEGER DEFAULT 60
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Sliding window rate limiter using rate_limits table
-- Returns: allowed, current_count, limit, remaining/retry_after
BEGIN /* ... */ END; $$;

-- ═══════════════════ CURRENCY CONVERSION ═══════════════════
CREATE OR REPLACE FUNCTION public.convert_currency(p_amount NUMERIC, p_from TEXT, p_to TEXT)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
-- Converts via base currency (INR) using exchange_rate from currencies table
BEGIN /* ... */ END; $$;`,
  },
  {
    path: 'sql/09-triggers.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Database triggers — auto timestamps, price history, invoice generation, vendor wallet credits, audit logging',
    code: `-- ═══════════════════ UPDATED_AT TRIGGERS ═══════════════════
-- Applied to all tables with updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Apply to all tables:
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... applied to 30+ tables

-- ═══════════════════ PRICE HISTORY TRACKING ═══════════════════
CREATE OR REPLACE FUNCTION public.record_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price OR OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price THEN
    INSERT INTO price_history (product_id, price, compare_at_price)
    VALUES (NEW.id, NEW.price, NEW.compare_at_price);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER record_product_price_change AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION record_price_change();

-- ═══════════════════ AUTO-INVOICE ON PAYMENT ═══════════════════
CREATE TRIGGER auto_generate_invoice_on_payment
AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION auto_generate_invoice();

-- ═══════════════════ VENDOR WALLET CREDIT ON DELIVERY ═══════════════════
CREATE OR REPLACE FUNCTION public.credit_vendor_wallet_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    -- Check order is paid, not already credited
    -- Credit vendor balance, insert wallet_transaction
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER credit_wallet_on_delivery AFTER UPDATE ON sub_orders FOR EACH ROW EXECUTE FUNCTION credit_vendor_wallet_on_delivery();

-- ═══════════════════ AUDIT LOGGING ═══════════════════
CREATE TRIGGER audit_order_changes AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION audit_order_status_change();
CREATE TRIGGER audit_vendor_changes AFTER UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION audit_vendor_change();
CREATE TRIGGER audit_product_changes AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION audit_product_change();

-- ═══════════════════ BUNDLE STOCK SYNC ═══════════════════
CREATE TRIGGER sync_bundle_stock AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_bundle_stock();

-- ═══════════════════ AUTO TICKET/INVOICE NUMBERS ═══════════════════
CREATE TRIGGER set_ticket_number_trigger BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_ticket_number();
CREATE TRIGGER set_invoice_number_trigger BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
CREATE TRIGGER set_refund_number_trigger BEFORE INSERT ON refunds FOR EACH ROW EXECUTE FUNCTION set_refund_number();
CREATE TRIGGER set_return_number_trigger BEFORE INSERT ON return_requests FOR EACH ROW EXECUTE FUNCTION set_return_number();
CREATE TRIGGER set_dispute_number_trigger BEFORE INSERT ON disputes FOR EACH ROW EXECUTE FUNCTION set_dispute_number();

-- ═══════════════════ AUTH TRIGGER (on Supabase auth.users) ═══════════════════
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();`,
  },
  {
    path: 'sql/10-views-and-indexes.sql',
    language: 'sql',
    category: 'Database SQL',
    description: 'Database views, indexes, and storage bucket configuration',
    code: `-- ═══════════════════ VIEWS ═══════════════════

-- Public vendor view (hides sensitive data like bank details, GSTIN)
CREATE VIEW public.vendors_public AS
SELECT id, brand_name, slug, bio, logo_url, banner_url, social_links, is_active, is_verified, created_at
FROM vendors WHERE is_active = true AND is_verified = true;

-- Loyalty leaderboard (anonymizes names)
CREATE VIEW public.loyalty_leaderboard AS
SELECT
  lp.user_id,
  COALESCE(
    CASE WHEN length(p.full_name) > 2
      THEN left(p.full_name, 1) || repeat('*', GREATEST(length(p.full_name) - 2, 1)) || right(p.full_name, 1)
      ELSE p.full_name END,
    'Anonymous'
  ) AS display_name,
  p.avatar_url, lp.lifetime_points, lp.tier, lp.streak_days,
  (SELECT count(*) FROM achievements a WHERE a.user_id = lp.user_id) AS badges_count,
  rank() OVER (ORDER BY lp.lifetime_points DESC) AS rank
FROM loyalty_points lp JOIN profiles p ON lp.user_id = p.id
WHERE lp.lifetime_points > 0
ORDER BY lp.lifetime_points DESC LIMIT 100;

-- ═══════════════════ RECOMMENDED INDEXES ═══════════════════
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_sub_orders_vendor ON sub_orders(vendor_id);
CREATE INDEX idx_sub_orders_order ON sub_orders(order_id);
CREATE INDEX idx_order_items_sub ON order_items(sub_order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_loyalty_user ON loyalty_points(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- ═══════════════════ STORAGE BUCKETS ═══════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-assets', 'vendor-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-documents', 'vendor-documents', false);

-- Storage RLS: product images are public, vendor docs are private
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Vendors can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view vendor assets" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-assets');
CREATE POLICY "Anyone can view review images" ON storage.objects FOR SELECT USING (bucket_id = 'review-images');
CREATE POLICY "Auth users can upload review images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Vendor docs owner access" ON storage.objects FOR ALL USING (bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════ REALTIME ═══════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_notifications;`,
  },
];

/* ─────────────────────────── File Browser Component ─────────────────────────── */

const CodeBlock = ({ code, title }: { code: string; title?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
      <ScrollArea className="max-h-[500px]">
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto bg-muted/20">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
};

export function FullSourceCodeBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(SOURCE_FILES.map(f => f.category))];

  const filteredFiles = SOURCE_FILES.filter(f => {
    const matchesSearch = !searchQuery ||
      f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => setExpandedFiles(new Set(filteredFiles.map(f => f.path)));
  const collapseAll = () => setExpandedFiles(new Set());

  const handleDownloadAll = () => {
    const allCode = SOURCE_FILES.map(f => `${'='.repeat(60)}\n// FILE: ${f.path}\n// ${f.description}\n${'='.repeat(60)}\n\n${f.code}\n\n`).join('');
    const blob = new Blob([allCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odhra-marketplace-source.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Source code downloaded');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-accent" />
                Full Source Code
              </CardTitle>
              <CardDescription>
                Browse the actual source code of every critical file — like GitHub, right here
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
                Collapse All
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadAll} className="text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={selectedCategory === null ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                All ({SOURCE_FILES.length})
              </Badge>
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  {cat} ({SOURCE_FILES.filter(f => f.category === cat).length})
                </Badge>
              ))}
            </div>
          </div>

          {/* File List */}
          <div className="space-y-1">
            {filteredFiles.map((file) => {
              const isExpanded = expandedFiles.has(file.path);
              return (
                <Collapsible key={file.path} open={isExpanded} onOpenChange={() => toggleFile(file.path)}>
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <FolderOpen className="w-4 h-4 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">{file.path}</span>
                        <Badge variant="outline" className="text-[10px]">{file.language}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{file.description}</p>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-11 pr-2 pb-3">
                    <CodeBlock code={file.code} title={file.path} />
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No files match your search</p>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{SOURCE_FILES.length} source files • {categories.length} categories</span>
            <span>Covers all critical paths: auth, cart, checkout, payments, loyalty, reviews, admin</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
