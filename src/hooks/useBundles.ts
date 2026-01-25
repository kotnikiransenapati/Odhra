import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Bundle {
  id: string;
  vendor_id: string;
  title: string;
  slug: string;
  description: string | null;
  bundle_price: number;
  compare_at_price: number | null;
  image_url: string | null;
  is_active: boolean;
  stock: number;
  sold_count: number;
  created_at: string;
  items?: BundleItem[];
  vendor?: {
    brand_name: string;
    slug: string;
  };
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    product_images: { url: string; is_primary: boolean }[];
  };
}

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBundles = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        vendor:vendors(brand_name, slug),
        items:bundle_items(
          *,
          product:products(
            id, title, slug, price,
            product_images(url, is_primary)
          )
        )
      `)
      .eq('is_active', true)
      .gt('stock', 0)
      .order('sold_count', { ascending: false });

    if (!error && data) {
      setBundles(data as Bundle[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const getBundleBySlug = useCallback(async (slug: string): Promise<Bundle | null> => {
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        vendor:vendors(brand_name, slug),
        items:bundle_items(
          *,
          product:products(
            id, title, slug, price, stock,
            product_images(url, is_primary)
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching bundle:', error);
      return null;
    }

    return data as Bundle;
  }, []);

  const calculateSavings = useCallback((bundle: Bundle): number => {
    if (!bundle.items) return 0;
    
    const totalItemsPrice = bundle.items.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);

    return totalItemsPrice - bundle.bundle_price;
  }, []);

  return {
    bundles,
    isLoading,
    getBundleBySlug,
    calculateSavings,
    refresh: fetchBundles,
  };
}
