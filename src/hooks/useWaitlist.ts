import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WaitlistEntry {
  id: string;
  product_id: string;
  user_id: string;
  email: string;
  notified_at: string | null;
  created_at: string;
}

export interface WaitlistEntryWithProduct extends WaitlistEntry {
  product: {
    id: string;
    title: string;
    slug: string | null;
    stock: number;
    is_active: boolean;
    product_images: { url: string; is_primary: boolean | null }[];
  } | null;
}

export function useWaitlistStatus(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['waitlist-status', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('product_waitlist')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as WaitlistEntry | null;
    },
    enabled: !!user && !!productId,
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.email) throw new Error('User email required');

      const { data, error } = await supabase
        .from('product_waitlist')
        .insert({
          product_id: productId,
          user_id: user.id,
          email: user.email
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-status', productId] });
      toast.success("You'll be notified when this product is back in stock!");
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.info("You're already on the waitlist for this product");
      } else {
        toast.error('Failed to join waitlist');
      }
    },
  });
}

export function useLeaveWaitlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('product_waitlist')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-status', productId] });
      toast.success('Removed from waitlist');
    },
    onError: () => {
      toast.error('Failed to leave waitlist');
    },
  });
}

export function useProductWaitlistCount(productId: string) {
  return useQuery({
    queryKey: ['waitlist-count', productId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('product_waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!productId,
  });
}

export function useMyWaitlistEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-waitlist-entries', user?.id],
    queryFn: async (): Promise<WaitlistEntryWithProduct[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('product_waitlist')
        .select(`
          *,
          product:products (
            id,
            title,
            slug,
            stock,
            is_active,
            product_images (url, is_primary)
          )
        `)
        .eq('user_id', user.id)
        .is('notified_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WaitlistEntryWithProduct[];
    },
    enabled: !!user,
  });
}

// Admin hook to get all waitlist entries
export function useAllWaitlistEntries(productId?: string) {
  return useQuery({
    queryKey: ['all-waitlist', productId],
    queryFn: async () => {
      let query = supabase
        .from('product_waitlist')
        .select(`
          *,
          products:product_id (title, slug)
        `)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
