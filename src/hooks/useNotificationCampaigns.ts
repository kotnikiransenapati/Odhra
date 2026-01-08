import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationCampaign {
  id: string;
  name: string;
  title: string;
  message: string;
  segment: string;
  channel: string;
  status: string;
  scheduled_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export function useNotificationCampaigns() {
  return useQuery({
    queryKey: ['notification-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as NotificationCampaign[];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaign: Omit<NotificationCampaign, 'id' | 'created_at' | 'updated_at' | 'sent_count' | 'open_count' | 'click_count'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('notification_campaigns')
        .insert({
          ...campaign,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotificationCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update campaign: ' + error.message);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete campaign: ' + error.message);
    },
  });
}

// Get customer segment counts from real data
export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get customers with wishlists
      const { count: wishlistUsers } = await supabase
        .from('wishlists')
        .select('user_id', { count: 'exact', head: true });
      
      // Get cart data for abandonment
      const { count: cartAbandonments } = await supabase
        .from('carts')
        .select('*', { count: 'exact', head: true })
        .not('items', 'eq', '[]');
      
      return {
        all_customers: totalCustomers || 0,
        cart_abandonment: cartAbandonments || 0,
        wishlist_users: wishlistUsers || 0,
        first_time_buyers: 0, // Would need order analysis
        repeat_customers: 0,
        high_value: 0,
        inactive_30_days: 0,
        inactive_90_days: 0,
      };
    },
  });
}
