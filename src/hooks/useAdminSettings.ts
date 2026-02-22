import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string | null;
  updated_at: string;
}

interface CMSContent {
  id: string;
  type: string;
  slug: string;
  title: string;
  content: any;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationCampaign {
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

// System Settings Hooks
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category');
      
      if (error) throw error;
      
      // Convert to object for easier access
      const settings: Record<string, any> = {};
      (data as SystemSetting[])?.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      
      return { raw: data as SystemSetting[], grouped: settings };
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value, category, description }: { key: string; value: any; category?: string; description?: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key, value, category: category || 'appearance', description: description || null, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update setting: ' + error.message);
    },
  });
}

export function useBulkUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { key: string; value: any }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}

// CMS Content Hooks
export function useCMSContent(type?: string) {
  return useQuery({
    queryKey: ['cms-content', type],
    queryFn: async () => {
      let query = supabase
        .from('cms_content')
        .select('*')
        .order('sort_order');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CMSContent[];
    },
  });
}

export function useCreateCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: { type: string; slug: string; title: string; content?: any; is_active?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('cms_content')
        .insert([content])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      toast.success('Content created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create content: ' + error.message);
    },
  });
}

export function useUpdateCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CMSContent> & { id: string }) => {
      const { error } = await supabase
        .from('cms_content')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      toast.success('Content updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update content: ' + error.message);
    },
  });
}

export function useDeleteCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      toast.success('Content deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete content: ' + error.message);
    },
  });
}

export function useReorderCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('cms_content')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
    },
  });
}

// Notification Campaign Hooks
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
    mutationFn: async (campaign: { name: string; title: string; message: string; segment: string; channel?: string; status?: string; scheduled_at?: string }) => {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .insert([campaign])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotificationCampaign> & { id: string }) => {
      const { error } = await supabase
        .from('notification_campaigns')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error('Failed to delete campaign: ' + error.message);
    },
  });
}

// Customer Segment Stats
export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      // Fetch real segment counts
      const [
        totalCustomers,
        cartAbandoners,
        wishlistUsers,
        firstTimeBuyers,
        inactive30,
        inactive90
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('carts').select('user_id', { count: 'exact', head: true })
          .not('user_id', 'is', null)
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('wishlists').select('user_id', { count: 'exact', head: true }),
        supabase.from('orders')
          .select('customer_id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .lt('updated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Get repeat customers count (3+ orders)
      const { data: repeatData } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('payment_status', 'paid');
      
      const customerOrderCounts: Record<string, number> = {};
      (repeatData || []).forEach((o: any) => {
        customerOrderCounts[o.customer_id] = (customerOrderCounts[o.customer_id] || 0) + 1;
      });
      const repeatCustomersCount = Object.values(customerOrderCounts).filter(c => c >= 3).length;
      
      // Get high value customers (spent 10000+)
      const { data: highValueData } = await supabase
        .from('orders')
        .select('customer_id, total_amount')
        .eq('payment_status', 'paid');
      
      const customerSpending: Record<string, number> = {};
      (highValueData || []).forEach((o: any) => {
        customerSpending[o.customer_id] = (customerSpending[o.customer_id] || 0) + o.total_amount;
      });
      const highValueCount = Object.values(customerSpending).filter(s => s >= 10000).length;

      return [
        { id: 'all_customers', name: 'All Customers', count: totalCustomers.count || 0 },
        { id: 'cart_abandonment', name: 'Cart Abandoners', count: cartAbandoners.count || 0 },
        { id: 'wishlist_users', name: 'Wishlist Savers', count: wishlistUsers.count || 0 },
        { id: 'first_time_buyers', name: 'First-time Buyers', count: firstTimeBuyers.count || 0 },
        { id: 'repeat_customers', name: 'Repeat Customers', count: repeatCustomersCount },
        { id: 'high_value', name: 'High Value', count: highValueCount },
        { id: 'inactive_30_days', name: 'Inactive (30 days)', count: inactive30.count || 0 },
        { id: 'inactive_90_days', name: 'Inactive (90 days)', count: inactive90.count || 0 },
      ];
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
