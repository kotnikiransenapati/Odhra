import { supabase } from '@/integrations/supabase/client';

interface OrderItemData {
  product_id: string;
  product_title: string | null;
}

interface ProductImageData {
  url: string;
}

interface ProductData {
  id: string;
  title: string;
}

// Helper functions to fetch data with explicit typing to avoid deep type inference issues

export async function fetchActiveProducts(limit = 20): Promise<ProductData[]> {
  const { data, error } = await (supabase as any)
    .from('products')
    .select('id, title')
    .eq('is_active', true)
    .limit(limit);
  
  if (error || !data) return [];
  return data as ProductData[];
}

export async function fetchProductImages(productIds: string[]): Promise<{ product_id: string; url: string; is_primary: boolean }[]> {
  const { data, error } = await (supabase as any)
    .from('product_images')
    .select('product_id, url, is_primary')
    .in('product_id', productIds);
  
  if (error || !data) return [];
  return data;
}

export async function fetchOrderItemByOrderId(orderId: string): Promise<OrderItemData | null> {
  const { data, error } = await (supabase as any)
    .from('order_items')
    .select('product_id, product_title')
    .eq('order_id', orderId)
    .limit(1);
  
  if (error || !data || data.length === 0) return null;
  return data[0] as OrderItemData;
}

export async function fetchProductImageByProductId(productId: string): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('product_images')
    .select('url')
    .eq('product_id', productId)
    .limit(1);
  
  if (error || !data || data.length === 0) return null;
  return (data[0] as ProductImageData).url;
}

export interface RecentPurchase {
  order_id: string;
  created_at: string;
  city: string | null;
  product_id: string;
  product_title: string;
  image_url: string | null;
}

// Fetch real recent paid purchases (joins orders -> order_items -> product_images).
export async function fetchRecentPaidPurchases(
  lookbackDays = 30,
  limit = 25,
): Promise<RecentPurchase[]> {
  const since = new Date(Date.now() - lookbackDays * 86400_000).toISOString();
  const { data: orders, error } = await (supabase as any)
    .from('orders')
    .select('id, created_at, shipping_address')
    .eq('payment_status', 'paid')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !orders || orders.length === 0) return [];

  const orderIds = orders.map((o: any) => o.id);
  const { data: items } = await (supabase as any)
    .from('order_items')
    .select('order_id, product_id, product_title')
    .in('order_id', orderIds);

  if (!items || items.length === 0) return [];

  const productIds = Array.from(new Set(items.map((i: any) => i.product_id).filter(Boolean))) as string[];
  const images = productIds.length ? await fetchProductImages(productIds) : [];
  const imageByProduct = new Map<string, string>();
  images.forEach((img) => {
    if (!imageByProduct.has(img.product_id) || img.is_primary) {
      imageByProduct.set(img.product_id, img.url);
    }
  });

  const firstItemByOrder = new Map<string, any>();
  items.forEach((it: any) => {
    if (!firstItemByOrder.has(it.order_id)) firstItemByOrder.set(it.order_id, it);
  });

  return orders
    .map((o: any): RecentPurchase | null => {
      const it = firstItemByOrder.get(o.id);
      if (!it) return null;
      const addr = o.shipping_address || {};
      return {
        order_id: o.id,
        created_at: o.created_at,
        city: addr.city || addr.town || null,
        product_id: it.product_id,
        product_title: it.product_title || 'an item',
        image_url: it.product_id ? imageByProduct.get(it.product_id) || null : null,
      };
    })
    .filter(Boolean) as RecentPurchase[];
}

