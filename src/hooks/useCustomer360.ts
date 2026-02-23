import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, differenceInDays } from 'date-fns';

export interface Customer360Metrics {
  ltv: number;
  avgOrderValue: number;
  purchaseFrequency: number; // orders per month
  daysSinceLastPurchase: number;
  churnRisk: 'low' | 'medium' | 'high' | 'churned';
  churnScore: number; // 0-100
  totalOrders: number;
  totalSpent: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  averageDaysBetweenOrders: number;
  preferredCategories: string[];
  preferredPaymentMethod: string;
  returnRate: number;
  reviewCount: number;
  loyaltyTier: string;
  predictedNextPurchase: string | null;
}

export function useCustomer360Metrics(customerId: string) {
  return useQuery({
    queryKey: ['customer-360-metrics', customerId],
    queryFn: async (): Promise<Customer360Metrics> => {
      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, payment_status, payment_method, created_at')
        .eq('customer_id', customerId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: true });

      // Fetch returns
      const { data: returns } = await supabase
        .from('return_requests')
        .select('id')
        .eq('customer_id', customerId);

      // Fetch reviews
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', customerId);

      // Fetch loyalty
      const { data: loyalty } = await supabase
        .from('loyalty_points')
        .select('tier')
        .eq('user_id', customerId)
        .single();

      // Fetch order items with categories for preferred categories
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, sub_orders!inner(order_id, orders!inner(customer_id))')
        .eq('sub_orders.orders.customer_id', customerId)
        .limit(100);

      const paidOrders = orders || [];
      const totalOrders = paidOrders.length;
      const totalSpent = paidOrders.reduce((s, o) => s + o.total_amount, 0);
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      const firstOrderDate = paidOrders[0]?.created_at || null;
      const lastOrderDate = paidOrders[paidOrders.length - 1]?.created_at || null;

      // Purchase frequency (orders per month)
      const now = new Date();
      const daysSinceFirst = firstOrderDate ? differenceInDays(now, new Date(firstOrderDate)) : 0;
      const monthsSinceFirst = Math.max(daysSinceFirst / 30, 1);
      const purchaseFrequency = totalOrders / monthsSinceFirst;

      // Days since last purchase
      const daysSinceLastPurchase = lastOrderDate ? differenceInDays(now, new Date(lastOrderDate)) : 999;

      // Average days between orders
      let avgDaysBetween = 0;
      if (paidOrders.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < paidOrders.length; i++) {
          gaps.push(differenceInDays(new Date(paidOrders[i].created_at), new Date(paidOrders[i - 1].created_at)));
        }
        avgDaysBetween = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      }

      // Churn score calculation (0 = loyal, 100 = churned)
      let churnScore = 0;
      if (totalOrders === 0) {
        churnScore = 100;
      } else if (totalOrders === 1) {
        churnScore = daysSinceLastPurchase > 90 ? 85 : daysSinceLastPurchase > 30 ? 50 : 30;
      } else {
        // Based on deviation from average gap
        const expectedNextPurchaseIn = avgDaysBetween > 0 ? avgDaysBetween : 30;
        const overdue = daysSinceLastPurchase - expectedNextPurchaseIn;
        if (overdue <= 0) churnScore = 5;
        else if (overdue <= expectedNextPurchaseIn * 0.5) churnScore = 25;
        else if (overdue <= expectedNextPurchaseIn) churnScore = 50;
        else if (overdue <= expectedNextPurchaseIn * 2) churnScore = 75;
        else churnScore = 90;
      }

      const churnRisk: Customer360Metrics['churnRisk'] =
        churnScore >= 80 ? 'churned' :
        churnScore >= 50 ? 'high' :
        churnScore >= 25 ? 'medium' : 'low';

      // LTV prediction (simple: avg order value × predicted future orders in 12 months)
      const predictedOrdersPerYear = purchaseFrequency * 12;
      const ltv = totalSpent + (avgOrderValue * Math.max(predictedOrdersPerYear - totalOrders, 0));

      // Return rate
      const returnRate = totalOrders > 0 ? ((returns?.length || 0) / totalOrders) * 100 : 0;

      // Preferred payment method
      const paymentMethods: Record<string, number> = {};
      paidOrders.forEach(o => {
        const method = o.payment_method || 'unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      const preferredPaymentMethod = Object.entries(paymentMethods)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Predicted next purchase
      let predictedNextPurchase: string | null = null;
      if (lastOrderDate && avgDaysBetween > 0) {
        const nextDate = new Date(lastOrderDate);
        nextDate.setDate(nextDate.getDate() + Math.round(avgDaysBetween));
        predictedNextPurchase = nextDate.toISOString();
      }

      return {
        ltv: Math.round(ltv),
        avgOrderValue: Math.round(avgOrderValue),
        purchaseFrequency: Math.round(purchaseFrequency * 10) / 10,
        daysSinceLastPurchase,
        churnRisk,
        churnScore: Math.round(churnScore),
        totalOrders,
        totalSpent: Math.round(totalSpent),
        firstOrderDate,
        lastOrderDate,
        averageDaysBetweenOrders: Math.round(avgDaysBetween),
        preferredCategories: [], // Would need category join
        preferredPaymentMethod,
        returnRate: Math.round(returnRate * 10) / 10,
        reviewCount: reviewCount || 0,
        loyaltyTier: loyalty?.tier || 'bronze',
        predictedNextPurchase,
      };
    },
    enabled: !!customerId,
  });
}
