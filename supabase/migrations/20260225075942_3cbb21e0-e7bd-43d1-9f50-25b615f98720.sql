
-- Add sales velocity and forecasting columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS avg_daily_sales numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_until_stockout integer,
  ADD COLUMN IF NOT EXISTS reorder_point integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS reorder_quantity integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_restock_at timestamptz,
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Create inventory_forecasts table for historical tracking
CREATE TABLE IF NOT EXISTS public.inventory_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  avg_daily_sales numeric NOT NULL DEFAULT 0,
  sales_trend text DEFAULT 'stable', -- rising, falling, stable
  days_until_stockout integer,
  recommended_reorder_qty integer,
  confidence_score numeric DEFAULT 0, -- 0-100
  period_days integer DEFAULT 30
);

ALTER TABLE public.inventory_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage forecasts"
  ON public.inventory_forecasts FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Vendors can view own product forecasts"
  ON public.inventory_forecasts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.vendors v ON p.vendor_id = v.id
      WHERE p.id = product_id AND v.user_id = auth.uid()
    )
  );

-- Create batch_stock_operations table for audit trail
CREATE TABLE IF NOT EXISTS public.batch_stock_operations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by uuid NOT NULL,
  operation_type text NOT NULL DEFAULT 'adjustment', -- adjustment, restock, write_off, transfer
  items_affected integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_stock_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage batch ops"
  ON public.batch_stock_operations FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Vendors can view own batch ops"
  ON public.batch_stock_operations FOR SELECT
  USING (performed_by = auth.uid());

CREATE POLICY "Vendors can create batch ops"
  ON public.batch_stock_operations FOR INSERT
  WITH CHECK (performed_by = auth.uid());

-- Function to compute sales velocity for all products
CREATE OR REPLACE FUNCTION public.compute_inventory_forecasts(p_period_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prod RECORD;
  daily_sales NUMERIC;
  prev_daily_sales NUMERIC;
  trend TEXT;
  stockout_days INTEGER;
  reorder_qty INTEGER;
  confidence NUMERIC;
  updated_count INTEGER := 0;
BEGIN
  FOR prod IN 
    SELECT p.id, p.stock, p.reorder_point, p.reorder_quantity
    FROM products p
    WHERE p.is_active = true
  LOOP
    -- Calculate avg daily sales from order_items in the period
    SELECT COALESCE(SUM(oi.quantity)::numeric / GREATEST(p_period_days, 1), 0)
    INTO daily_sales
    FROM order_items oi
    JOIN sub_orders so ON oi.sub_order_id = so.id
    JOIN orders o ON so.order_id = o.id
    WHERE oi.product_id = prod.id
      AND o.payment_status IN ('paid', 'cod_pending')
      AND o.created_at >= now() - (p_period_days || ' days')::interval;

    -- Previous period for trend
    SELECT COALESCE(SUM(oi.quantity)::numeric / GREATEST(p_period_days, 1), 0)
    INTO prev_daily_sales
    FROM order_items oi
    JOIN sub_orders so ON oi.sub_order_id = so.id
    JOIN orders o ON so.order_id = o.id
    WHERE oi.product_id = prod.id
      AND o.payment_status IN ('paid', 'cod_pending')
      AND o.created_at >= now() - (p_period_days * 2 || ' days')::interval
      AND o.created_at < now() - (p_period_days || ' days')::interval;

    -- Determine trend
    IF daily_sales > prev_daily_sales * 1.2 THEN
      trend := 'rising';
    ELSIF daily_sales < prev_daily_sales * 0.8 THEN
      trend := 'falling';
    ELSE
      trend := 'stable';
    END IF;

    -- Days until stockout
    IF daily_sales > 0 THEN
      stockout_days := FLOOR(prod.stock / daily_sales);
    ELSE
      stockout_days := NULL; -- No sales, can't predict
    END IF;

    -- Smart reorder quantity: 2x lead time coverage (assume 14 day lead time)
    IF daily_sales > 0 THEN
      reorder_qty := GREATEST(CEIL(daily_sales * 30), prod.reorder_quantity); -- 30 day supply minimum
    ELSE
      reorder_qty := prod.reorder_quantity;
    END IF;

    -- Confidence based on data availability
    confidence := LEAST(100, (daily_sales + prev_daily_sales) * 10 + 20);

    -- Update product
    UPDATE products
    SET avg_daily_sales = ROUND(daily_sales, 2),
        days_until_stockout = stockout_days
    WHERE id = prod.id;

    -- Insert forecast record
    INSERT INTO inventory_forecasts (
      product_id, avg_daily_sales, sales_trend, days_until_stockout,
      recommended_reorder_qty, confidence_score, period_days
    ) VALUES (
      prod.id, ROUND(daily_sales, 2), trend, stockout_days,
      reorder_qty, ROUND(confidence, 1), p_period_days
    );

    updated_count := updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'products_updated', updated_count);
END;
$$;

-- Index for faster forecast queries
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_product ON public.inventory_forecasts(product_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_stock_active ON public.products(stock) WHERE is_active = true;
