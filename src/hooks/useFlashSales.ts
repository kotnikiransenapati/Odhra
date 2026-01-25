import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export interface FlashSale {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  max_quantity_per_user: number;
  early_access_tiers: string[];
  early_access_hours: number;
}

export interface FlashSaleProduct {
  id: string;
  flash_sale_id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  quantity_available: number;
  quantity_sold: number;
  per_user_limit: number;
  product?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    product_images: { url: string; is_primary: boolean }[];
  };
}

export function useFlashSales() {
  const { user } = useAuth();
  const [activeFlashSales, setActiveFlashSales] = useState<FlashSale[]>([]);
  
  // Fetch user's loyalty tier
  const { data: loyaltyData } = useQuery({
    queryKey: ['user-loyalty-tier', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('loyalty_points')
        .select('tier')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlashSales = useCallback(async () => {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('ends_at', { ascending: true });

    if (!error && data) {
      setActiveFlashSales(data as FlashSale[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFlashSales();
    
    // Refresh every minute to check for new sales or expired ones
    const interval = setInterval(fetchFlashSales, 60000);
    return () => clearInterval(interval);
  }, [fetchFlashSales]);

  const getFlashSaleProducts = useCallback(async (flashSaleId: string) => {
    const { data, error } = await supabase
      .from('flash_sale_products')
      .select(`
        *,
        product:products(
          id, title, slug, description,
          product_images(url, is_primary)
        )
      `)
      .eq('flash_sale_id', flashSaleId)
      .gt('quantity_available', 0);

    if (error) {
      console.error('Error fetching flash sale products:', error);
      return [];
    }

    return data as FlashSaleProduct[];
  }, []);

  const hasEarlyAccess = useCallback((flashSale: FlashSale): boolean => {
    if (!user || !loyaltyData) return false;
    
    const userTier = loyaltyData?.tier || 'bronze';
    return flashSale.early_access_tiers.includes(userTier);
  }, [user, loyaltyData]);

  const getTimeRemaining = useCallback((endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, expired: false };
  }, []);

  return {
    activeFlashSales,
    isLoading,
    getFlashSaleProducts,
    hasEarlyAccess,
    getTimeRemaining,
    refresh: fetchFlashSales,
  };
}
