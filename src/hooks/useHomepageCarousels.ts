import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface CarouselConfig {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
  order: number;
  settings: {
    limit?: number;
    sortBy?: 'newest' | 'popular' | 'trending' | 'rating' | 'price-asc' | 'price-desc';
    categorySlug?: string;
    featured?: boolean;
    showDeals?: boolean;
    pinnedProductIds?: string[];
    bgColor?: string;
    badge?: string;
    badgeColor?: string;
    viewAllLink?: string;
  };
}

export interface CarouselProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_featured: boolean;
  avg_rating: number | null;
  product_images: { url: string; is_primary: boolean }[];
  vendors_public: { brand_name: string } | null;
}

export function useHomepageCarousels() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('homepage-carousels-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['homepage-carousels'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['homepage-carousels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('type', 'product_carousel')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((item): CarouselConfig => {
        const content = item.content as Record<string, any>;
        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          subtitle: content.subtitle || undefined,
          isActive: item.is_active,
          order: item.sort_order,
          settings: {
            limit: content.limit || 10,
            sortBy: content.sortBy || 'newest',
            categorySlug: content.categorySlug || undefined,
            featured: content.featured || false,
            showDeals: content.showDeals || false,
            pinnedProductIds: content.pinnedProductIds || [],
            bgColor: content.bgColor || undefined,
            badge: content.badge || undefined,
            badgeColor: content.badgeColor || undefined,
            viewAllLink: content.viewAllLink || '/shop',
          },
        };
      });
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// Hook to fetch products for a carousel with pinned products first
export function useCarouselProducts(config: CarouselConfig | null) {
  return useQuery({
    queryKey: ['carousel-products', config?.id, config?.settings],
    queryFn: async () => {
      if (!config) return [];

      const { settings } = config;
      const limit = settings.limit || 10;
      const pinnedIds = settings.pinnedProductIds || [];

      // Fetch pinned products first if any
      let pinnedProducts: CarouselProduct[] = [];
      if (pinnedIds.length > 0) {
        const { data: pinned } = await supabase
          .from('products')
          .select(`
            id, title, slug, price, compare_at_price, stock, is_featured, avg_rating,
            product_images (url, is_primary),
            vendors_public!inner (brand_name)
          `)
          .in('id', pinnedIds)
          .eq('is_active', true);

        if (pinned) {
          // Sort by pinned order
          pinnedProducts = pinnedIds
            .map(id => pinned.find(p => p.id === id))
            .filter(Boolean) as CarouselProduct[];
        }
      }

      // Calculate remaining limit
      const remainingLimit = Math.max(0, limit - pinnedProducts.length);
      if (remainingLimit === 0) {
        return pinnedProducts;
      }

      // Build query for remaining products
      let query = supabase
        .from('products')
        .select(`
          id, title, slug, price, compare_at_price, stock, is_featured, avg_rating,
          product_images (url, is_primary),
          vendors_public!inner (brand_name)
        `)
        .eq('is_active', true);

      // Exclude already pinned products
      if (pinnedIds.length > 0) {
        query = query.not('id', 'in', `(${pinnedIds.join(',')})`);
      }

      // Apply category filter
      if (settings.categorySlug) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', settings.categorySlug)
          .single();

        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      // Apply featured filter
      if (settings.featured) {
        query = query.eq('is_featured', true);
      }

      // Apply deals filter (products with compare_at_price > price)
      if (settings.showDeals) {
        query = query.not('compare_at_price', 'is', null);
        query = query.gt('compare_at_price', 0);
      }

      // Apply sorting
      switch (settings.sortBy) {
        case 'popular':
          query = query.order('sold_count', { ascending: false, nullsFirst: false });
          break;
        case 'trending':
          query = query.order('view_count', { ascending: false, nullsFirst: false });
          break;
        case 'rating':
          query = query.order('avg_rating', { ascending: false, nullsFirst: false });
          break;
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      query = query.limit(remainingLimit);

      const { data } = await query;

      return [...pinnedProducts, ...(data || [])] as CarouselProduct[];
    },
    enabled: !!config,
    staleTime: 60000,
  });
}

// Hook for deals carousel - automatically shows discounted products
export function useDealsProducts(limit: number = 10) {
  return useQuery({
    queryKey: ['deals-products', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, title, slug, price, compare_at_price, stock, is_featured, avg_rating,
          product_images (url, is_primary),
          vendors_public!inner (brand_name)
        `)
        .eq('is_active', true)
        .not('compare_at_price', 'is', null)
        .gt('compare_at_price', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter products where compare_at_price > price (actual deals)
      return (data || []).filter(p => 
        p.compare_at_price && p.compare_at_price > p.price
      ) as CarouselProduct[];
    },
    staleTime: 60000,
  });
}
