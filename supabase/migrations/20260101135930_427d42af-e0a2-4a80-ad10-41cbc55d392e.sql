-- Odhra Marketplace Phase 2: Products, Orders & Promotions Schema

-- 1. Create order status enum
CREATE TYPE public.order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- 2. Create payment status enum
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'paid', 'failed', 'refunded', 'escrow'
);

-- 3. Create promotion type enum
CREATE TYPE public.promotion_type AS ENUM (
  'coupon', 'flash_sale', 'spin_wheel', 'bundle', 'buy_x_get_y'
);

-- 4. Create wallet transaction type enum
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'sale', 'commission', 'payout', 'refund', 'adjustment'
);

-- 5. Categories table (hierarchical)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- 6. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  description_html TEXT,
  price DECIMAL(12, 2) NOT NULL,
  compare_at_price DECIMAL(12, 2),
  cost_price DECIMAL(12, 2),
  sku TEXT,
  barcode TEXT,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  variants JSONB DEFAULT '[]'::jsonb,
  options JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_digital BOOLEAN NOT NULL DEFAULT false,
  weight DECIMAL(8, 2),
  dimensions JSONB,
  seo_title TEXT,
  seo_description TEXT,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  sold_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, slug)
);

CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active, is_featured);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_tags ON public.products USING GIN(tags);

-- 7. Product images table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- 8. Orders table (master order)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  payment_id TEXT,
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  customer_note TEXT,
  admin_note TEXT,
  promotion_id UUID,
  promotion_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- 9. Sub-orders table (vendor-specific split)
CREATE TABLE public.sub_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  sub_order_number TEXT NOT NULL UNIQUE,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12, 2) NOT NULL,
  shipping_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  vendor_earnings DECIMAL(12, 2) NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  return_window_ends_at TIMESTAMPTZ,
  vendor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_orders_order ON public.sub_orders(order_id);
CREATE INDEX idx_sub_orders_vendor ON public.sub_orders(vendor_id);
CREATE INDEX idx_sub_orders_status ON public.sub_orders(status);

-- 10. Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  variant_info JSONB,
  sku TEXT,
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_sub_order ON public.order_items(sub_order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- 11. Vendor wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  type public.wallet_transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_vendor ON public.wallet_transactions(vendor_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- 12. Payout requests
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  bank_details JSONB,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_requests_vendor ON public.payout_requests(vendor_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

-- 13. Promotions table
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.promotion_type NOT NULL,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(12, 2) NOT NULL,
  min_order_amount DECIMAL(12, 2) DEFAULT 0,
  max_discount_amount DECIMAL(12, 2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  applicable_products UUID[] DEFAULT '{}',
  applicable_categories UUID[] DEFAULT '{}',
  applicable_vendors UUID[] DEFAULT '{}',
  excluded_products UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_code ON public.promotions(code);
CREATE INDEX idx_promotions_type ON public.promotions(type);
CREATE INDEX idx_promotions_active ON public.promotions(is_active, starts_at, ends_at);

-- 14. Promotion usage tracking
CREATE TABLE public.promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, order_id)
);

CREATE INDEX idx_promotion_usages_promotion ON public.promotion_usages(promotion_id);
CREATE INDEX idx_promotion_usages_user ON public.promotion_usages(user_id);

-- 15. Product reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  helpful_count INT DEFAULT 0,
  vendor_reply TEXT,
  vendor_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product ON public.reviews(product_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- 16. Wishlist
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- 17. Cart table
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_carts_user ON public.carts(user_id);
CREATE INDEX idx_carts_session ON public.carts(session_id);

-- Enable RLS on all new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Categories: Public read
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Products: Public read active, vendors manage own
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.vendors WHERE id = vendor_id AND is_active = true
  ));

CREATE POLICY "Vendors can manage own products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Product images: Follow product access
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Vendors can manage own product images" ON public.product_images
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
  ));

-- Orders: Customers see own, vendors see related, admins see all
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Sub-orders: Vendors see own, customers see own parent orders
CREATE POLICY "Vendors can view own sub-orders" ON public.sub_orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Vendors can update own sub-orders" ON public.sub_orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Customers can view own sub-orders" ON public.sub_orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid()));

CREATE POLICY "Admins can manage all sub-orders" ON public.sub_orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Order items
CREATE POLICY "Users can view related order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sub_orders so
    JOIN public.orders o ON so.order_id = o.id
    WHERE so.id = sub_order_id AND (
      o.customer_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = so.vendor_id AND v.user_id = auth.uid()) OR
      public.is_admin(auth.uid())
    )
  ));

-- Wallet transactions: Vendors see own
CREATE POLICY "Vendors can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage wallet transactions" ON public.wallet_transactions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Payout requests: Vendors manage own
CREATE POLICY "Vendors can view own payout requests" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Vendors can create payout requests" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage payout requests" ON public.payout_requests
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Promotions: Public read active, admins manage
CREATE POLICY "Anyone can view active promotions" ON public.promotions
  FOR SELECT TO anon, authenticated USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Promotion usages
CREATE POLICY "Users can view own promotion usage" ON public.promotion_usages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert promotion usage" ON public.promotion_usages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_approved = true);

CREATE POLICY "Users can manage own reviews" ON public.reviews
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Vendors can reply to reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = product_id AND v.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Wishlists: Users manage own
CREATE POLICY "Users can manage own wishlist" ON public.wishlists
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Carts: Users manage own
CREATE POLICY "Users can manage own cart" ON public.carts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous can manage session cart" ON public.carts
  FOR ALL TO anon USING (session_id IS NOT NULL) WITH CHECK (session_id IS NOT NULL);

-- Update triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sub_orders_updated_at BEFORE UPDATE ON public.sub_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  prefix TEXT := 'ODH';
BEGIN
  new_number := prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || 
                upper(substring(md5(random()::text) from 1 for 6));
  RETURN new_number;
END;
$$;

-- Function to generate sub-order number
CREATE OR REPLACE FUNCTION public.generate_sub_order_number(parent_order_number TEXT, vendor_index INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN parent_order_number || '-V' || vendor_index;
END;
$$;