import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  avg_rating: number | null;
  review_count: number | null;
  category_id: string | null;
  vendor_id: string;
  tags: string[] | null;
  created_at: string;
  product_images: {
    url: string;
    is_primary: boolean;
    alt_text: string | null;
  }[];
  vendors: {
    brand_name: string;
    slug: string;
  } | null;
  categories: {
    name: string;
    slug: string;
  } | null;
}

interface UseProductsOptions {
  categorySlug?: string | null;
  featured?: boolean;
  limit?: number;
  searchQuery?: string;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { categorySlug, featured, limit, searchQuery } = options;

  return useQuery({
    queryKey: ['products', { categorySlug, featured, limit, searchQuery }],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_images (url, is_primary, alt_text),
          vendors!inner (brand_name, slug),
          categories (name, slug)
        `)
        .eq('is_active', true);

      if (categorySlug) {
        query = query.eq('categories.slug', categorySlug);
      }

      if (featured) {
        query = query.eq('is_featured', true);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (id, url, is_primary, alt_text, sort_order),
          vendors!inner (id, brand_name, slug, bio, logo_url),
          categories (id, name, slug)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Product & {
        product_images: { id: string; url: string; is_primary: boolean; alt_text: string | null; sort_order: number }[];
        vendors: { id: string; brand_name: string; slug: string; bio: string | null; logo_url: string | null };
        categories: { id: string; name: string; slug: string } | null;
      } | null;
    },
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
