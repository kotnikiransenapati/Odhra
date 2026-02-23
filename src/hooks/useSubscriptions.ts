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

      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      const nextBillingDate = calculateNextBillingDate(plan.interval, plan.interval_count);

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
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 1);

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
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) throw new Error('Subscription not found');

      const plan = subscription.plan as SubscriptionPlan;
      const currentDate = new Date(subscription.next_billing_date);
      const newDate = calculateNextBillingDate(plan.interval, plan.interval_count, currentDate);

      const { error } = await supabase
        .from('subscriptions')
        .update({
          next_billing_date: newDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

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

// Swap subscription product (upgrade/downgrade)
export function useSwapSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      newPlanId,
    }: {
      subscriptionId: string;
      newPlanId: string;
    }) => {
      const { data: newPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', newPlanId)
        .single();

      if (planError || !newPlan) throw new Error('Plan not found');

      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: newPlanId,
          product_id: newPlan.product_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      return newPlan;
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success(`Switched to ${newPlan.name}`);
    },
    onError: () => {
      toast.error('Failed to switch plan');
    },
  });
}

// Update subscription shipping address
export function useUpdateSubscriptionAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      address,
    }: {
      subscriptionId: string;
      address: Record<string, string | number>;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          shipping_address: address as unknown as null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success('Delivery address updated');
    },
    onError: () => {
      toast.error('Failed to update address');
    },
  });
}

// Subscription analytics for the customer
export function useSubscriptionAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('user_id', user.id);

      if (!subs) return null;

      const { data: orders } = await supabase
        .from('subscription_orders')
        .select('*')
        .in('subscription_id', subs.map(s => s.id));

      const totalSaved = subs.reduce((acc, sub) => {
        const plan = sub.plan as SubscriptionPlan | null;
        if (!plan) return acc;
        const originalMonthly = (sub as any).product?.price ?? plan.price / (1 - plan.discount_percentage / 100);
        const savings = (originalMonthly - plan.price) * sub.total_orders * sub.quantity;
        return acc + Math.max(0, savings);
      }, 0);

      return {
        totalSubscriptions: subs.length,
        activeCount: subs.filter(s => s.status === 'active').length,
        totalOrders: orders?.filter(o => o.status === 'paid').length ?? 0,
        totalSpent: subs.reduce((a, s) => a + s.total_spent, 0),
        totalSaved: Math.round(totalSaved),
        skippedOrders: orders?.filter(o => o.status === 'skipped').length ?? 0,
        failedOrders: orders?.filter(o => o.status === 'failed').length ?? 0,
      };
    },
    enabled: !!user,
  });
}

// Helper
function calculateNextBillingDate(
  interval: string,
  intervalCount: number,
  from?: Date
): Date {
  const date = from ? new Date(from) : new Date();
  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7 * intervalCount);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14 * intervalCount);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + intervalCount);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3 * intervalCount);
      break;
  }
  return date;
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
