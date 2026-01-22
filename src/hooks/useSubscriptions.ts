import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  interval: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  interval_count: number;
  price: number;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  shipping_address: Record<string, unknown>;
  next_billing_date: string;
  last_billed_at: string | null;
  total_orders: number;
  total_spent: number;
  pause_until: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    product_images?: { url: string; is_primary: boolean }[];
  };
  vendor?: {
    brand_name: string;
    logo_url: string | null;
  };
}

export interface SubscriptionOrder {
  id: string;
  subscription_id: string;
  order_id: string | null;
  billing_amount: number;
  status: 'pending' | 'paid' | 'failed' | 'skipped';
  billing_attempt: number;
  next_retry_at: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

// Get subscription plans for a product
export function useProductSubscriptionPlans(productId: string) {
  return useQuery({
    queryKey: ['subscription-plans', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
    enabled: !!productId,
  });
}

// Get user's subscriptions
export function useUserSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          product:products(id, title, slug, price, product_images(url, is_primary)),
          vendor:vendors(brand_name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!user,
  });
}

// Get subscription order history
export function useSubscriptionOrders(subscriptionId: string) {
  return useQuery({
    queryKey: ['subscription-orders', subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_orders')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SubscriptionOrder[];
    },
    enabled: !!subscriptionId,
  });
}

// Create a subscription
export function useCreateSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      productId,
      vendorId,
      quantity,
      shippingAddress,
    }: {
      planId: string;
      productId: string;
      vendorId: string;
      quantity: number;
      shippingAddress: Record<string, string | number>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get the plan to calculate next billing date
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Calculate next billing date based on interval
      const nextBillingDate = new Date();
      switch (plan.interval) {
        case 'weekly':
          nextBillingDate.setDate(nextBillingDate.getDate() + 7 * plan.interval_count);
          break;
        case 'biweekly':
          nextBillingDate.setDate(nextBillingDate.getDate() + 14 * plan.interval_count);
          break;
        case 'monthly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + plan.interval_count);
          break;
        case 'quarterly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3 * plan.interval_count);
          break;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          product_id: productId,
          vendor_id: vendorId,
          quantity,
          shipping_address: shippingAddress as unknown as null,
          next_billing_date: nextBillingDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subscription');
    },
  });
}

// Pause a subscription
export function usePauseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      pauseUntil,
    }: {
      subscriptionId: string;
      pauseUntil: Date;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'paused',
          pause_until: pauseUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription paused');
    },
    onError: () => {
      toast.error('Failed to pause subscription');
    },
  });
}

// Resume a subscription
export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      // Calculate new next billing date
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 1); // Next day

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          pause_until: null,
          next_billing_date: nextBillingDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription resumed');
    },
    onError: () => {
      toast.error('Failed to resume subscription');
    },
  });
}

// Cancel a subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      reason,
    }: {
      subscriptionId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Subscription cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel subscription');
    },
  });
}

// Update subscription quantity
export function useUpdateSubscriptionQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      quantity,
    }: {
      subscriptionId: string;
      quantity: number;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Quantity updated');
    },
    onError: () => {
      toast.error('Failed to update quantity');
    },
  });
}

// Skip next order
export function useSkipNextOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      // Get current subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) throw new Error('Subscription not found');

      // Calculate new next billing date
      const currentDate = new Date(subscription.next_billing_date);
      const plan = subscription.plan as SubscriptionPlan;
      
      switch (plan.interval) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7 * plan.interval_count);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14 * plan.interval_count);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + plan.interval_count);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3 * plan.interval_count);
          break;
      }

      // Update subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          next_billing_date: currentDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Record skipped order
      await supabase.from('subscription_orders').insert({
        subscription_id: subscriptionId,
        billing_amount: plan.price * subscription.quantity,
        status: 'skipped',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-orders'] });
      toast.success('Next order skipped');
    },
    onError: () => {
      toast.error('Failed to skip order');
    },
  });
}

// Helper to format interval
export function formatInterval(interval: string, count: number = 1): string {
  const intervalMap: Record<string, string> = {
    weekly: count === 1 ? 'Weekly' : `Every ${count} weeks`,
    biweekly: count === 1 ? 'Every 2 weeks' : `Every ${count * 2} weeks`,
    monthly: count === 1 ? 'Monthly' : `Every ${count} months`,
    quarterly: count === 1 ? 'Quarterly' : `Every ${count * 3} months`,
  };
  return intervalMap[interval] || interval;
}
