import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    is_active: boolean;
    product_images: { url: string; is_primary: boolean }[];
    vendors: { brand_name: string; slug: string } | null;
  };
}

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async (): Promise<WishlistItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products (
            id,
            title,
            slug,
            price,
            compare_at_price,
            stock,
            is_active,
            product_images (url, is_primary),
            vendors (brand_name, slug)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WishlistItem[];
    },
    enabled: !!user,
  });
}

export function useWishlistCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useIsInWishlist(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist-check', user?.id, productId],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!productId,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: productId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check', user?.id, productId] });
      toast.success('Added to wishlist');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Already in wishlist');
      } else {
        toast.error('Failed to add to wishlist');
      }
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check', user?.id, productId] });
      toast.success('Removed from wishlist');
    },
    onError: () => {
      toast.error('Failed to remove from wishlist');
    },
  });
}

export function useToggleWishlist() {
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  return {
    toggle: async (productId: string, isInWishlist: boolean) => {
      if (isInWishlist) {
        await removeFromWishlist.mutateAsync(productId);
      } else {
        await addToWishlist.mutateAsync(productId);
      }
    },
    isPending: addToWishlist.isPending || removeFromWishlist.isPending,
  };
}
