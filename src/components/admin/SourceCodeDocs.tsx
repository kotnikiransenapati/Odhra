import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Code2, Database, Server, Shield, FolderTree, Layers, Zap, Globe,
  ChevronDown, Copy, Check, FileCode, Terminal, Lock, Users, ShoppingCart,
  CreditCard, Bell, Package, Truck, Gift, MessageSquare, BarChart3,
  Palette, Search, Image, Settings, Workflow
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CodeBlock = ({ code, language = 'typescript', title }: { code: string; language?: string; title?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden my-3">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
      <ScrollArea className="max-h-[400px]">
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto bg-muted/20">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
};

const Section = ({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full p-4 rounded-lg hover:bg-muted/50 transition-colors group">
        <Icon className="w-5 h-5 text-accent" />
        <span className="font-semibold text-sm flex-1 text-left">{title}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="pl-8 space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export function SourceCodeDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Source Code & Documentation</h2>
        <p className="text-muted-foreground mt-1">Complete technical blueprint to recreate this marketplace from scratch</p>
      </div>

      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="architecture" className="gap-1.5 text-xs"><Layers className="w-3.5 h-3.5" />Architecture</TabsTrigger>
          <TabsTrigger value="frontend" className="gap-1.5 text-xs"><Code2 className="w-3.5 h-3.5" />Frontend</TabsTrigger>
          <TabsTrigger value="database" className="gap-1.5 text-xs"><Database className="w-3.5 h-3.5" />Database</TabsTrigger>
          <TabsTrigger value="backend" className="gap-1.5 text-xs"><Server className="w-3.5 h-3.5" />Backend</TabsTrigger>
          <TabsTrigger value="auth" className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" />Auth & Security</TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />Features</TabsTrigger>
          <TabsTrigger value="setup" className="gap-1.5 text-xs"><Terminal className="w-3.5 h-3.5" />Setup Guide</TabsTrigger>
        </TabsList>

        {/* ─── ARCHITECTURE ─── */}
        <TabsContent value="architecture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-accent" />System Architecture</CardTitle>
              <CardDescription>High-level overview of the multi-vendor marketplace stack</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Tech Stack" icon={FolderTree} defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Framework', value: 'React 18 + TypeScript + Vite', badge: 'Frontend' },
                    { label: 'Styling', value: 'Tailwind CSS + shadcn/ui + Framer Motion', badge: 'UI' },
                    { label: 'State', value: 'TanStack React Query + React Context', badge: 'State' },
                    { label: 'Database', value: 'PostgreSQL (Supabase)', badge: 'Backend' },
                    { label: 'Auth', value: 'Supabase Auth + RLS + RBAC', badge: 'Security' },
                    { label: 'Functions', value: 'Deno Edge Functions (Supabase)', badge: 'Serverless' },
                    { label: 'Payments', value: 'Razorpay + Stripe (dual gateway)', badge: 'Payments' },
                    { label: 'Search', value: 'Algolia InstantSearch', badge: 'Search' },
                    { label: 'Email', value: 'Resend API + HTML templates', badge: 'Email' },
                    { label: 'Storage', value: 'Supabase Storage (S3-compatible)', badge: 'Files' },
                    { label: 'PWA', value: 'vite-plugin-pwa + Service Worker', badge: 'Mobile' },
                    { label: 'Routing', value: 'React Router v6 with lazy loading', badge: 'Navigation' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                      <Badge variant="outline" className="text-[10px] shrink-0">{item.badge}</Badge>
                      <div>
                        <p className="font-medium text-foreground text-xs">{item.label}</p>
                        <p className="text-xs">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Project Structure" icon={FolderTree}>
                <CodeBlock title="Directory Layout" language="text" code={`src/
├── components/
│   ├── admin/          # 50+ admin dashboard modules
│   ├── auth/           # Login, signup, 2FA, OTP
│   ├── cart/           # Cart drawer, mini-cart, promo input
│   ├── checkout/       # Address picker, payment flow
│   ├── home/           # Hero, carousels, CMS sections
│   ├── layout/         # Navbar, bottom nav, mega menu
│   ├── loyalty/        # Points, tiers, challenges, leaderboard
│   ├── marketing/      # Spin wheel, exit intent, flash sale
│   ├── notifications/  # Push, cookie consent, in-app
│   ├── orders/         # Order card, status badge, cancel
│   ├── product/        # Variants, size guide, social proof
│   ├── referral/       # Referral dashboard
│   ├── reviews/        # Review form, stars, image upload
│   ├── search/         # Algolia, global modal, voice search
│   ├── shop/           # Product cards, filters, quick view
│   ├── ui/             # 60+ shadcn/ui primitives
│   ├── vendor/         # Onboarding, bulk upload, KYC
│   └── wishlist/       # Wishlist button & card
├── contexts/           # Auth, Cart, Language, Vendor
├── hooks/              # 80+ custom hooks (data fetching, UI logic)
├── pages/
│   ├── admin/          # Admin dashboard (tabbed SPA)
│   ├── customer/       # Account, orders, wallet, rewards
│   └── vendor/         # Vendor dashboard, products, analytics
├── lib/                # Utilities, validators, API helpers
└── integrations/       # Supabase client & auto-generated types

supabase/
├── functions/          # 18 Edge Functions (Deno)
│   ├── create-razorpay-order/
│   ├── verify-razorpay-payment/
│   ├── create-stripe-checkout/
│   ├── create-cod-order/
│   ├── razorpay-webhook/
│   ├── stripe-webhook/
│   ├── send-email/
│   ├── send-whatsapp/
│   ├── send-push-notification/
│   ├── cart-abandonment-email/
│   ├── ai-chatbot/
│   ├── get-recommendations/
│   ├── generate-product-description/
│   ├── analyze-review-sentiment/
│   ├── sync-algolia/
│   ├── delivery-webhook/
│   ├── inventory-alerts/
│   ├── health-check/
│   └── extract-pdf-products/
└── migrations/         # SQL migration files`} />
              </Section>

              <Section title="Data Flow Architecture" icon={Workflow}>
                <p className="text-foreground font-medium mb-2">Request → Response Flow:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li><strong>Client</strong>: React component calls custom hook (e.g., <code>useOrders</code>)</li>
                  <li><strong>Hook</strong>: Uses TanStack Query + Supabase JS client to make RPC/REST call</li>
                  <li><strong>Supabase</strong>: PostgREST validates JWT, applies RLS policies</li>
                  <li><strong>Database</strong>: PostgreSQL executes query, triggers fire (e.g., audit logs)</li>
                  <li><strong>Response</strong>: Data returns through the same chain, cached by React Query</li>
                </ol>
                <p className="mt-3 text-foreground font-medium mb-2">Payment Flow:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Client POSTs to Edge Function <code>create-razorpay-order</code></li>
                  <li>Function validates cart against DB prices (prevents tampering)</li>
                  <li>Creates Razorpay order via API + inserts DB order (pending)</li>
                  <li>Client opens Razorpay checkout modal</li>
                  <li>On success, client calls <code>verify-razorpay-payment</code></li>
                  <li>Function verifies signature, updates order to <code>paid</code>, deducts stock atomically</li>
                  <li>DB trigger auto-generates invoice</li>
                </ol>
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FRONTEND ─── */}
        <TabsContent value="frontend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code2 className="w-5 h-5 text-accent" />Frontend Code</CardTitle>
              <CardDescription>React components, hooks, and UI patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Key Dependencies (package.json)" icon={Package} defaultOpen>
                <CodeBlock title="package.json — key deps" code={`{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@supabase/supabase-js": "^2.89.0",
    "@tanstack/react-query": "^5.83.0",
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.462.0",
    "recharts": "^2.15.4",
    "zod": "^3.25.76",
    "react-hook-form": "^7.61.1",
    "@hookform/resolvers": "^3.10.0",
    "algoliasearch": "^5.47.0",
    "react-instantsearch": "^7.22.1",
    "canvas-confetti": "^1.9.4",
    "date-fns": "^3.6.0",
    "sonner": "^1.7.4",
    "class-variance-authority": "^0.7.1",
    "tailwind-merge": "^2.6.0",
    "embla-carousel-react": "^8.6.0",
    "vite-plugin-pwa": "^1.2.0"
  }
}`} />
              </Section>

              <Section title="Supabase Client Setup" icon={Globe}>
                <CodeBlock title="src/integrations/supabase/client.ts" code={`import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);`} />
              </Section>

              <Section title="Custom Hook Pattern (example: useOrders)" icon={ShoppingCart}>
                <CodeBlock title="Hook Pattern" code={`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('orders')
        .select(\`
          *, 
          sub_orders(*, order_items(*, products(title, images))),
          promotions(code)
        \`)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      if (error) throw error;
      // Restore stock via RPC
      await supabase.rpc('restore_order_stock', { p_order_id: orderId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  return { orders, isLoading, cancelOrder };
};`} />
              </Section>

              <Section title="Context Pattern (AuthContext)" icon={Users}>
                <CodeBlock title="Auth Context Pattern" code={`// contexts/AuthContext.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: object) => {
    return supabase.auth.signUp({
      email, password,
      options: { data: metadata }  // e.g., { referral_code: 'ABC123' }
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}`} />
              </Section>

              <Section title="Cart Context (with localStorage + DB sync)" icon={ShoppingCart}>
                <CodeBlock title="Cart Pattern" code={`// On login: merge localStorage cart into DB cart
// On logout: keep localStorage cart
// Guest checkout: cart lives in localStorage only

const addToCart = (product, quantity, variant) => {
  setItems(prev => {
    const existing = prev.find(i => i.product_id === product.id && 
      JSON.stringify(i.variant) === JSON.stringify(variant));
    if (existing) {
      return prev.map(i => i === existing 
        ? { ...i, quantity: i.quantity + quantity } : i);
    }
    return [...prev, { product_id: product.id, quantity, variant, ...product }];
  });
};

// Sync to Supabase 'carts' table when user is logged in
useEffect(() => {
  if (user && items.length > 0) {
    supabase.from('carts')
      .upsert({ user_id: user.id, items: JSON.stringify(items) });
  }
}, [items, user]);`} />
              </Section>

              <Section title="Admin Dashboard Structure" icon={Settings}>
                <p>The admin panel is a single-page tabbed dashboard at <code>/admin</code> with <strong>50+ lazy-loaded modules</strong>. Each module is a separate component under <code>src/components/admin/</code>.</p>
                <p className="mt-2">Navigation uses <code>useSearchParams</code> for tab state (<code>?tab=orders</code>), enabling deep-linking and browser back/forward.</p>
                <p className="mt-2">Permission gating via <code>SECTION_PERMISSIONS</code> map + <code>admin_has_permission()</code> DB function checks role-based access.</p>
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DATABASE ─── */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-accent" />Database Schema</CardTitle>
              <CardDescription>PostgreSQL tables, functions, and triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Core Tables" icon={Database} defaultOpen>
                <CodeBlock title="Core Commerce Tables" code={`-- Users & Roles
profiles (id, email, full_name, phone, avatar_url, ...)
user_roles (user_id, role)  -- role: 'user' | 'vendor' | 'admin'

-- Products & Categories
products (id, vendor_id, title, slug, description, price, compare_at_price,
  stock, low_stock_threshold, sku, images[], category_id, tags[], 
  is_active, sold_count, hsn_code, weight, dimensions, ...)
categories (id, name, slug, parent_id, image_url, sort_order, is_active)
product_bundles (id, title, slug, products[], bundle_price, ...)

-- Orders & Payments
orders (id, customer_id, order_number, status, payment_status,
  payment_provider, payment_id, shipping_address, billing_address,
  subtotal, discount_amount, shipping_amount, tax_amount, total_amount,
  promotion_id, promotion_code, customer_note, currency,
  risk_score, fraud_status, guest_email, guest_phone, ...)
sub_orders (id, order_id, vendor_id, sub_order_number, status,
  subtotal, tax_amount, total_amount, commission_rate, 
  commission_amount, vendor_earnings, tracking_number, ...)
order_items (id, sub_order_id, product_id, product_title, product_image,
  quantity, unit_price, total_price, variant_info, ...)

-- Vendors
vendors (id, user_id, brand_name, slug, description, logo_url,
  commission_rate, balance, is_active, is_verified, gstin, 
  bank_details, kyc_status, ...)

-- Reviews  
reviews (id, product_id, user_id, rating, title, comment, 
  images[], is_approved, is_verified_purchase, sentiment_score, ...)

-- Promotions
promotions (id, code, discount_type, discount_value, min_order_amount,
  max_discount_amount, usage_limit, usage_count, starts_at, ends_at, ...)
flash_sales (id, title, slug, starts_at, ends_at, ...)
flash_sale_products (id, flash_sale_id, product_id, flash_price, quantity_available, ...)`} />
              </Section>

              <Section title="Loyalty & Gamification Tables" icon={Gift}>
                <CodeBlock title="Loyalty System" code={`-- Points & Tiers
loyalty_points (user_id, points, lifetime_points, tier, streak_days, ...)
loyalty_transactions (id, user_id, points, transaction_type, source, description, ...)
-- Tiers: bronze (0) → silver (500) → gold (2000) → platinum (5000) → diamond (10000)

-- Achievements & Badges
badge_definitions (id, name, description, icon, criteria, points_reward, ...)
achievements (id, user_id, badge_id, earned_at, ...)

-- Referrals
referral_codes (id, user_id, code, total_referrals, is_active, ...)
referrals (id, referrer_id, referred_id, referral_code, status, 
  referrer_reward, referred_reward, ...)

-- Spin Wheel
spin_wheel_entries (id, user_id, code, discount_type, discount_value,
  status, expires_at, qualifying_order_id, ...)

-- Points Redemption
redemption_options (id, name, points_cost, reward_type, reward_value, ...)
points_redemptions (id, user_id, option_id, points_spent, reward_code, ...)`} />
              </Section>

              <Section title="Key Database Functions" icon={Zap}>
                <CodeBlock title="Critical RPC Functions" code={`-- Atomic stock deduction (prevents overselling)
CREATE FUNCTION deduct_product_stock(p_product_id UUID, p_quantity INT) RETURNS JSONB
-- Uses SELECT ... FOR UPDATE to lock the row

-- Atomic points redemption (prevents double-spend)
CREATE FUNCTION redeem_loyalty_points(p_user_id UUID, p_points_cost INT, ...) RETURNS JSONB
-- Uses SELECT ... FOR UPDATE to prevent race conditions

-- Add loyalty points with auto tier calculation
CREATE FUNCTION add_loyalty_points(p_user_id UUID, p_points INT, p_source TEXT, ...) RETURNS JSONB

-- Check if user can spin the wheel
CREATE FUNCTION can_user_spin(p_user_id UUID) RETURNS JSONB
-- Business rules: first spin free, then requires ₹999+ order

-- Fraud detection engine
CREATE FUNCTION check_order_fraud(p_order_id UUID) RETURNS JSONB
-- Velocity checks, amount anomalies, address mismatches

-- Dynamic pricing engine
CREATE FUNCTION get_dynamic_price(p_product_id UUID, ...) RETURNS JSONB

-- Vendor performance scoring  
CREATE FUNCTION compute_vendor_performance(p_period_start DATE, ...) RETURNS VOID

-- Auto-referral processing (runs on user signup trigger)
CREATE FUNCTION handle_new_user() RETURNS TRIGGER
-- Extracts referral_code from signup metadata, awards points

-- Auto-invoice generation (runs when order payment_status → paid)
CREATE FUNCTION auto_generate_invoice() RETURNS TRIGGER

-- Stock restoration on cancellation
CREATE FUNCTION restore_order_stock(p_order_id UUID) RETURNS VOID

-- RBAC permission check
CREATE FUNCTION admin_has_permission(_user_id UUID, _permission TEXT) RETURNS BOOLEAN
CREATE FUNCTION is_admin(_user_id UUID) RETURNS BOOLEAN
CREATE FUNCTION is_vendor(_user_id UUID) RETURNS BOOLEAN`} />
              </Section>

              <Section title="Row Level Security (RLS) Patterns" icon={Lock}>
                <CodeBlock title="RLS Policy Examples" code={`-- Users can only see their own orders
CREATE POLICY "Users view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

-- Admins can see all orders
CREATE POLICY "Admins view all orders" ON orders
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Vendors see sub_orders assigned to them
CREATE POLICY "Vendors view own sub_orders" ON sub_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

-- Products are publicly readable
CREATE POLICY "Products are public" ON products
  FOR SELECT USING (true);

-- Only vendor owner can update their products  
CREATE POLICY "Vendors update own products" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

-- Reviews: anyone can read approved, owners can CRUD their own
CREATE POLICY "Read approved reviews" ON reviews
  FOR SELECT USING (is_approved = true OR user_id = auth.uid());`} />
              </Section>

              <Section title="Storage Buckets" icon={Image}>
                <CodeBlock title="Storage Configuration" code={`-- Public buckets (anyone can read)
product-images    -- Product photos (vendors upload)
vendor-assets     -- Vendor logos, banners
review-images     -- Customer review photos

-- Private buckets (authenticated access only)
vendor-documents  -- KYC documents, bank proofs

-- Upload policy pattern:
CREATE POLICY "Vendors upload to product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );`} />
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BACKEND ─── */}
        <TabsContent value="backend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-accent" />Edge Functions (Serverless Backend)</CardTitle>
              <CardDescription>Deno-based serverless functions for payments, emails, AI, and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Payment Functions" icon={CreditCard} defaultOpen>
                <CodeBlock title="create-razorpay-order/index.ts — Key Logic" code={`// 1. Validate request body with Zod schemas
const validated = CreateOrderRequestSchema.parse(body);

// 2. Verify prices against database (prevent client-side tampering)
const { data: dbProducts } = await supabase
  .from('products').select('id, price, stock, is_active, vendor_id')
  .in('id', productIds);

for (const item of items) {
  const dbProduct = productMap.get(item.product_id);
  if (Math.abs(item.price - dbProduct.price) > 0.01)
    throw new Error("Price mismatch. Refresh cart.");
  if (dbProduct.stock < item.quantity) 
    throw new Error("Insufficient stock");
}

// 3. Calculate totals server-side
const subtotal = items.reduce((sum, item) => 
  sum + dbProduct.price * item.quantity, 0);
const tax = Math.round(subtotal * 0.18);

// 4. Create Razorpay order via API
const razorpayOrder = await fetch("https://api.razorpay.com/v1/orders", {
  method: "POST",
  headers: { Authorization: \`Basic \${btoa(KEY_ID + ':' + KEY_SECRET)}\` },
  body: JSON.stringify({ amount: total * 100, currency: "INR" }),
});

// 5. Create order + sub_orders (per vendor) + order_items in DB
// 6. Return razorpay_order_id to client for checkout modal`} />
                <CodeBlock title="verify-razorpay-payment — Signature Verification" code={`// Verify HMAC SHA256 signature
const generated = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(orderId + '|' + paymentId)
  .digest('hex');

if (generated !== signature) throw new Error('Invalid signature');

// Update order status, deduct stock atomically
await supabase.rpc('deduct_product_stock', { 
  p_product_id: item.product_id, p_quantity: item.quantity 
});`} />
              </Section>

              <Section title="Email & Notification Functions" icon={Bell}>
                <CodeBlock title="send-email/index.ts" code={`// Uses Resend API for transactional emails
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: \`Bearer \${RESEND_API_KEY}\` },
  body: JSON.stringify({
    from: "Odhra <noreply@yourdomain.com>",
    to: [recipientEmail],
    subject: subject,
    html: htmlTemplate,  // Built with template literals
  }),
});

// Templates: order confirmation, shipping update, 
// password reset, cart abandonment, vendor notifications`} />
              </Section>

              <Section title="AI Functions" icon={MessageSquare}>
                <CodeBlock title="AI-Powered Features" code={`// ai-chatbot: Customer support chatbot
// analyze-review-sentiment: Auto-scores reviews (-1 to 1)
// generate-product-description: AI product copywriting
// get-recommendations: Collaborative filtering recommendations

// All use Lovable AI (no API key needed)
// Pattern:
const response = await fetch(AI_ENDPOINT, {
  method: 'POST',
  headers: { Authorization: \`Bearer \${LOVABLE_API_KEY}\` },
  body: JSON.stringify({ prompt, model: 'google/gemini-2.5-flash' }),
});`} />
              </Section>

              <Section title="Integration Functions" icon={Globe}>
                <CodeBlock title="Third-Party Integrations" code={`// sync-algolia: Syncs products to Algolia search index
// delivery-webhook: Receives tracking updates from shipping partners
// inventory-alerts: Cron job to check low stock & notify vendors
// cart-abandonment-email: Multi-step drip campaign (1hr, 24hr, 72hr)
// send-whatsapp: WhatsApp Business API messaging
// send-push-notification: Web Push via service worker
// health-check: System health endpoint (DB, storage, auth, integrations)`} />
              </Section>

              <Section title="Environment Variables Required" icon={Lock}>
                <CodeBlock title="Required Secrets" code={`# Supabase (auto-configured)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Payments
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# Email
RESEND_API_KEY=re_xxx

# Search
ALGOLIA_APP_ID=xxx
ALGOLIA_ADMIN_KEY=xxx
ALGOLIA_SEARCH_KEY=xxx
ALGOLIA_INDEX_NAME=products

# AI (auto-configured with Lovable Cloud)
LOVABLE_API_KEY=xxx

# Frontend (.env)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...`} />
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── AUTH & SECURITY ─── */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-accent" />Authentication & Security</CardTitle>
              <CardDescription>Multi-role auth, RLS, rate limiting, and fraud detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Role-Based Access Control (RBAC)" icon={Users} defaultOpen>
                <CodeBlock title="Role System" code={`-- 3 base roles in user_roles table:
-- 'user'   → Customer (default on signup)
-- 'vendor' → Seller (after vendor onboarding approval)
-- 'admin'  → Platform admin

-- Admin sub-roles via admin_roles table:
-- Each role has an array of permission keys
-- Permission keys: view_orders, manage_products, view_analytics, etc.
-- 40+ granular permissions defined in admin_permission_definitions

-- Super Admin (owner): bypasses ALL permission checks
-- Standard Admin: checked via admin_has_permission() function

-- Frontend check:
const { data: permissions } = useQuery({
  queryKey: ['admin-permissions'],
  queryFn: () => supabase.rpc('get_admin_permissions', { _user_id: user.id })
});`} />
              </Section>

              <Section title="Authentication Flow" icon={Lock}>
                <CodeBlock title="Auth Implementation" code={`// Signup with email verification (NOT auto-confirm)
const { data, error } = await supabase.auth.signUp({
  email, password,
  options: { 
    data: { full_name, referral_code },
    emailRedirectTo: window.location.origin + '/auth'
  }
});

// On signup trigger (handle_new_user):
// 1. Creates profile record
// 2. Assigns 'user' role
// 3. Processes referral code (awards points)

// Protected routes use ProtectedRoute component:
<Route path="/account" element={
  <ProtectedRoute><CustomerAccount /></ProtectedRoute>
} />`} />
              </Section>

              <Section title="Rate Limiting" icon={Shield}>
                <CodeBlock title="Rate Limit RPC" code={`-- Database-level rate limiting
SELECT check_rate_limit(
  p_identifier := user_ip_or_id,
  p_endpoint := 'create_order',
  p_max_requests := 10,
  p_window_seconds := 60
);
-- Returns: { allowed: true/false, remaining: N }`} />
              </Section>

              <Section title="Fraud Detection" icon={Shield}>
                <p>Automated fraud scoring on every order via <code>check_order_fraud()</code> DB function:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><strong>Velocity check</strong>: Too many orders/hour from same user</li>
                  <li><strong>Amount anomaly</strong>: Daily spend exceeds threshold</li>
                  <li><strong>Address mismatch</strong>: Shipping ≠ billing city/state</li>
                  <li><strong>Score thresholds</strong>: &lt;20 clean, 20-50 flagged, 50-80 held, 80+ blocked</li>
                </ul>
              </Section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FEATURES ─── */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-accent" />Feature Inventory</CardTitle>
              <CardDescription>Complete list of all implemented features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { title: 'Multi-Vendor Commerce', icon: Package, features: [
                  'Vendor onboarding with KYC document upload',
                  'Per-vendor sub-orders with independent fulfillment',
                  'Commission management (configurable per vendor)',
                  'Vendor wallet with auto-credit on delivery',
                  'Vendor performance scorecard & grading',
                  'Vendor storefront pages with custom branding',
                  'Bulk product upload via CSV/PDF',
                  'AI-powered product description generation',
                ]},
                { title: 'Shopping Experience', icon: ShoppingCart, features: [
                  'Product variants (size, color, etc.) with stock per variant',
                  'Size guide dialog with measurement charts',
                  'Pincode-based delivery estimation',
                  'Frequently bought together recommendations',
                  'Complete your look suggestions',
                  'Price drop alerts & waitlist for out-of-stock',
                  'Dynamic pricing engine (time/inventory based)',
                  'Product comparison & quick view modal',
                  'Voice search integration',
                  'Algolia-powered instant search with filters',
                ]},
                { title: 'Payments & Checkout', icon: CreditCard, features: [
                  'Razorpay integration (UPI, cards, wallets, netbanking)',
                  'Stripe integration (international payments)',
                  'Cash on Delivery (COD) with fraud scoring',
                  'Guest checkout support',
                  'Address book with saved addresses',
                  'Promo code / coupon application',
                  'Shipping cost calculator',
                  'Multi-currency support (INR, USD, EUR, GBP)',
                  'Auto-invoice generation on payment',
                  'GST/HSN code support for tax compliance',
                ]},
                { title: 'Loyalty & Gamification', icon: Gift, features: [
                  '5-tier loyalty system (Bronze → Diamond)',
                  'Points for purchases, reviews, referrals, daily check-in',
                  'Streak bonuses (7-day, 30-day achievements)',
                  'Points redemption marketplace (coupons, free shipping)',
                  'Spin-to-win wheel (first spin free, then per ₹999 order)',
                  'Achievement badges (first purchase, review master, etc.)',
                  'Leaderboard with monthly ranking',
                  'Referral program with dual rewards (₹100/₹50)',
                  'Tier-up celebration animations',
                ]},
                { title: 'Marketing & Engagement', icon: BarChart3, features: [
                  'CMS-managed homepage (hero, carousels, banners)',
                  'Flash sales with countdown timers',
                  'A/B testing for banners & CTAs',
                  'Cart abandonment recovery (3-step email drip)',
                  'Exit intent popup with discount offer',
                  'Push notifications (web)',
                  'WhatsApp Business messaging',
                  'Email campaigns to customer segments',
                  'Promo strip / announcement bar',
                  'Social proof (live purchase notifications)',
                  'Urgency badges (low stock, trending)',
                ]},
                { title: 'Customer Support', icon: MessageSquare, features: [
                  'Support ticket system with SLA tracking',
                  'Real-time live chat (agent ↔ customer)',
                  'AI chatbot for common queries',
                  'Canned responses for agents',
                  'Ticket auto-assignment based on workload',
                  'CSAT ratings per ticket',
                  'Dispute management with evidence upload',
                  'Return/refund request flow',
                ]},
                { title: 'Admin Dashboard (50+ modules)', icon: Settings, features: [
                  'Real-time overview with KPI cards',
                  'Advanced analytics with charts (Recharts)',
                  'Order management with timeline view',
                  'Vendor management & KYC approval',
                  'Customer 360° view with purchase history',
                  'Customer segmentation (RFM analysis)',
                  'Review moderation with sentiment analysis',
                  'Inventory alerts & low stock notifications',
                  'Staff workload dashboard',
                  'Fraud detection dashboard',
                  'Error monitoring & logging',
                  'Feature flags management',
                  'Audit log viewer',
                  'Export/Import center (CSV/JSON)',
                  'Payment reconciliation',
                  'Theme/color palette customizer',
                ]},
              ].map(section => (
                <Section key={section.title} title={section.title} icon={section.icon}>
                  <ul className="space-y-1.5">
                    {section.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SETUP GUIDE ─── */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Terminal className="w-5 h-5 text-accent" />Setup Guide</CardTitle>
              <CardDescription>Step-by-step instructions to recreate this marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Section title="Step 1: Project Setup" icon={FolderTree} defaultOpen>
                <CodeBlock title="Terminal Commands" code={`# Create Vite + React + TypeScript project
npm create vite@latest odhra-marketplace -- --template react-ts
cd odhra-marketplace

# Install core dependencies
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install framer-motion lucide-react recharts zod react-hook-form @hookform/resolvers
npm install date-fns sonner canvas-confetti embla-carousel-react

# Install UI primitives (shadcn/ui)
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label 
npx shadcn@latest add select tabs toast badge sheet scroll-area
npx shadcn@latest add accordion alert-dialog avatar checkbox command
npx shadcn@latest add popover progress radio-group separator skeleton
npx shadcn@latest add slider switch table textarea toggle tooltip

# Install search
npm install algoliasearch react-instantsearch

# Install PWA plugin
npm install -D vite-plugin-pwa

# Install Tailwind utilities
npm install tailwind-merge tailwindcss-animate class-variance-authority`} />
              </Section>

              <Section title="Step 2: Supabase Setup" icon={Database}>
                <CodeBlock title="Supabase Configuration" code={`# 1. Create Supabase project at supabase.com (or use Lovable Cloud)
# 2. Get project URL and anon key from project settings
# 3. Create .env file:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# 4. Run all SQL migrations (in order) to create:
#    - Tables (profiles, products, orders, etc.)
#    - RLS policies for each table
#    - Database functions (RPCs)
#    - Triggers (handle_new_user, auto_generate_invoice, etc.)

# 5. Create storage buckets:
#    product-images (public)
#    vendor-assets (public)  
#    review-images (public)
#    vendor-documents (private)

# 6. Configure auth:
#    - Enable email provider
#    - Set site URL and redirect URLs
#    - DO NOT enable auto-confirm (users verify email)`} />
              </Section>

              <Section title="Step 3: Third-Party Services" icon={Globe}>
                <CodeBlock title="Service Setup" code={`# Razorpay (payments)
1. Create account at razorpay.com
2. Get Key ID and Key Secret from Dashboard → Settings → API Keys
3. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as Supabase secrets
4. Configure webhook URL: {SUPABASE_URL}/functions/v1/razorpay-webhook

# Resend (emails)
1. Create account at resend.com
2. Add and verify your domain
3. Get API key, set as RESEND_API_KEY secret

# Algolia (search)
1. Create account at algolia.com
2. Create an index named 'products'
3. Set ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, ALGOLIA_SEARCH_KEY secrets
4. Configure searchable attributes: title, description, tags, category

# Stripe (optional, international payments)
1. Get publishable and secret keys
2. Set STRIPE_SECRET_KEY as Supabase secret
3. Configure webhook for checkout.session.completed`} />
              </Section>

              <Section title="Step 4: Deploy Edge Functions" icon={Server}>
                <CodeBlock title="Edge Function Deployment" code={`# Each function lives in supabase/functions/{name}/index.ts
# Deploy all functions:
supabase functions deploy create-razorpay-order --no-verify-jwt
supabase functions deploy verify-razorpay-payment --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy create-stripe-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-cod-order --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-whatsapp --no-verify-jwt
supabase functions deploy send-push-notification --no-verify-jwt
supabase functions deploy cart-abandonment-email --no-verify-jwt
supabase functions deploy ai-chatbot --no-verify-jwt
supabase functions deploy get-recommendations --no-verify-jwt
supabase functions deploy generate-product-description
supabase functions deploy analyze-review-sentiment
supabase functions deploy sync-algolia --no-verify-jwt
supabase functions deploy delivery-webhook --no-verify-jwt
supabase functions deploy inventory-alerts --no-verify-jwt
supabase functions deploy health-check --no-verify-jwt
supabase functions deploy extract-pdf-products --no-verify-jwt

# Set secrets for all functions:
supabase secrets set RAZORPAY_KEY_ID=xxx RAZORPAY_KEY_SECRET=xxx
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set ALGOLIA_APP_ID=xxx ALGOLIA_ADMIN_KEY=xxx`} />
              </Section>

              <Section title="Step 5: Initial Data & Admin Setup" icon={Users}>
                <CodeBlock title="Bootstrap Commands" code={`-- 1. Sign up as the first user (will become super admin)

-- 2. Assign admin role:
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id', 'admin');

-- 3. Create admin user entry (owner):
INSERT INTO admin_users (user_id, is_owner, is_active) 
VALUES ('your-user-id', true, true);

-- 4. Seed categories:
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Men', 'men', 1),
  ('Women', 'women', 2),
  ('Electronics', 'electronics', 3),
  ('Home & Living', 'home-living', 4);

-- 5. Seed badge definitions:
INSERT INTO badge_definitions (id, name, description, icon, points_reward) VALUES
  ('first_purchase', 'First Purchase', 'Made your first order', '🛍️', 50),
  ('loyal_customer_10', 'Loyal Customer', 'Completed 10 orders', '⭐', 200),
  ('first_review', 'Critic', 'Wrote your first review', '✍️', 30);

-- 6. Seed currencies:
INSERT INTO currencies (code, name, symbol, exchange_rate, is_default) VALUES
  ('INR', 'Indian Rupee', '₹', 1, true),
  ('USD', 'US Dollar', '$', 0.012, false);

-- 7. Set up fraud rules, pricing rules, SLA configs via admin panel`} />
              </Section>

              <Section title="Step 6: Frontend Build & Deploy" icon={Globe}>
                <CodeBlock title="Build & Deploy" code={`# Development
npm run dev

# Production build
npm run build

# Deploy options:
# 1. Lovable (recommended): Click "Publish" in editor
# 2. Vercel: Connect GitHub repo, auto-deploys on push
# 3. Netlify: Same as Vercel
# 4. Self-host: Upload dist/ folder to any static host

# Environment variables needed in production:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key`} />
              </Section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
