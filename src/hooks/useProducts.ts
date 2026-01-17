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
  vendors_public: {
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
  categoryId?: string | null;
  featured?: boolean;
  limit?: number;
  searchQuery?: string;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'trending';
  tags?: string[];
}

export function useProducts(options: UseProductsOptions = {}) {
  const { categorySlug, categoryId, featured, limit, searchQuery, sortBy = 'newest', tags } = options;

  return useQuery({
    queryKey: ['products', { categorySlug, categoryId, featured, limit, searchQuery, sortBy, tags }],
    queryFn: async () => {
      // If filtering by category slug, first get the category ID
      let targetCategoryId = categoryId;
      
      if (categorySlug && !categoryId) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .eq('is_active', true)
          .single();
        
        if (category) {
          targetCategoryId = category.id;
        }
      }

      let query = supabase
        .from('products')
        .select(`
          *,
          product_images (url, is_primary, alt_text),
          vendors_public!inner (brand_name, slug),
          categories (name, slug)
        `)
        .eq('is_active', true);

      // Filter by category ID (more reliable than filtering by joined table)
      if (targetCategoryId) {
        query = query.eq('category_id', targetCategoryId);
      }

      if (featured) {
        query = query.eq('is_featured', true);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'popular':
          query = query.order('sold_count', { ascending: false, nullsFirst: false });
          break;
        case 'rating':
          query = query.order('avg_rating', { ascending: false, nullsFirst: false });
          break;
        case 'trending':
          query = query.order('view_count', { ascending: false, nullsFirst: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      if (limit) {
        query = query.limit(limit);
      }

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
          vendors_public!inner (id, brand_name, slug, bio, logo_url),
          categories (id, name, slug)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Product & {
        product_images: { id: string; url: string; is_primary: boolean; alt_text: string | null; sort_order: number }[];
        vendors_public: { id: string; brand_name: string; slug: string; bio: string | null; logo_url: string | null };
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
