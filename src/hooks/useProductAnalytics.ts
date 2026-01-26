import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductAnalytics {
  id: string;
  product_id: string;
  view_count: number;
  cart_add_count: number;
  purchase_count: number;
  wishlist_count: number;
  view_to_cart_rate: number;
  cart_to_purchase_rate: number;
  trending_score: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export function useProductAnalytics(productId: string) {
  return useQuery({
    queryKey: ['product-analytics', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_analytics')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      return data as ProductAnalytics | null;
    },
    enabled: !!productId,
  });
}

export function useTrendingProducts(limit = 10) {
  return useQuery({
    queryKey: ['trending-products', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_analytics')
        .select(`
          *,
          products:product_id (
            id,
            title,
            slug,
            price,
            compare_at_price,
            product_images (url, is_primary)
          )
        `)
        .order('trending_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

export function useFrequentlyBoughtTogether(productId: string, limit = 4) {
  return useQuery({
    queryKey: ['frequently-bought-together', productId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_associations')
        .select(`
          *,
          products!product_associations_associated_product_id_fkey (
            id,
            title,
            slug,
            price,
            compare_at_price,
            product_images (url, is_primary)
          )
        `)
        .eq('product_id', productId)
        .eq('association_type', 'frequently_bought_together')
        .order('strength', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}

export function useSimilarProducts(productId: string, limit = 4) {
  return useQuery({
    queryKey: ['similar-products', productId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_associations')
        .select(`
          *,
          products!product_associations_associated_product_id_fkey (
            id,
            title,
            slug,
            price,
            compare_at_price,
            product_images (url, is_primary)
          )
        `)
        .eq('product_id', productId)
        .eq('association_type', 'similar')
        .order('strength', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}

export function useViewedTogetherProducts(productId: string, limit = 4) {
  return useQuery({
    queryKey: ['viewed-together', productId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_associations')
        .select(`
          *,
          products!product_associations_associated_product_id_fkey (
            id,
            title,
            slug,
            price,
            compare_at_price,
            product_images (url, is_primary)
          )
        `)
        .eq('product_id', productId)
        .eq('association_type', 'viewed_together')
        .order('strength', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}

export function useAllProductAnalytics(limit = 50) {
  return useQuery({
    queryKey: ['all-product-analytics', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_analytics')
        .select(`
          *,
          products:product_id (
            id,
            title,
            slug,
            price
          )
        `)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}
