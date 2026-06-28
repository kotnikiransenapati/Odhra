import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Customer360Metrics {
  ltv: number;
  predictedLtv12m: number;
  avgOrderValue: number;
  purchaseFrequency: number;
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
  confidence: number;
  insights: string[];
}

type Customer360Rpc = {
  ltv: number;
  predicted_ltv_12m: number;
  avg_order_value: number;
  purchase_frequency: number;
  days_since_last_purchase: number;
  churn_risk: Customer360Metrics['churnRisk'];
  churn_score: number;
  total_orders: number;
  total_spent: number;
  first_order_date: string | null;
  last_order_date: string | null;
  average_days_between_orders: number;
  preferred_categories: string[];
  preferred_payment_method: string;
  return_rate: number;
  review_count: number;
  loyalty_tier: string;
  predicted_next_purchase: string | null;
  confidence: number;
  insights: string[];
};

function normalizeMetrics(data: Customer360Rpc): Customer360Metrics {
  return {
    ltv: Math.round(Number(data.ltv ?? 0)),
    predictedLtv12m: Math.round(Number(data.predicted_ltv_12m ?? data.ltv ?? 0)),
    avgOrderValue: Math.round(Number(data.avg_order_value ?? 0)),
    purchaseFrequency: Math.round(Number(data.purchase_frequency ?? 0) * 10) / 10,
    daysSinceLastPurchase: Number(data.days_since_last_purchase ?? 999),
    churnRisk: data.churn_risk ?? 'high',
    churnScore: Math.round(Number(data.churn_score ?? 0)),
    totalOrders: Number(data.total_orders ?? 0),
    totalSpent: Math.round(Number(data.total_spent ?? 0)),
    firstOrderDate: data.first_order_date,
    lastOrderDate: data.last_order_date,
    averageDaysBetweenOrders: Math.round(Number(data.average_days_between_orders ?? 0)),
    preferredCategories: Array.isArray(data.preferred_categories) ? data.preferred_categories : [],
    preferredPaymentMethod: data.preferred_payment_method || 'N/A',
    returnRate: Math.round(Number(data.return_rate ?? 0) * 10) / 10,
    reviewCount: Number(data.review_count ?? 0),
    loyaltyTier: data.loyalty_tier || 'bronze',
    predictedNextPurchase: data.predicted_next_purchase,
    confidence: Math.round(Number(data.confidence ?? 0)),
    insights: Array.isArray(data.insights) ? data.insights : [],
  };
}

export function useCustomer360Metrics(customerId: string) {
  return useQuery({
    queryKey: ['customer-360-metrics', customerId],
    queryFn: async (): Promise<Customer360Metrics> => {
      const { data, error } = await supabase.rpc('admin_customer_360_metrics' as any, { _customer_id: customerId });
      if (error) throw error;
      return normalizeMetrics(data as Customer360Rpc);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}
