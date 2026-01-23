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
