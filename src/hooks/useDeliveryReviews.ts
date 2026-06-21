import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryReviewItem {
  id: string;
  firstName: string;
  state: string;
  rating: number;
  comment: string;
  productName: string;
  createdAt: string;
}

function firstNameOf(full?: string | null): string {
  if (!full) return 'Customer';
  const trimmed = full.trim();
  if (!trimmed) return 'Customer';
  return trimmed.split(/\s+/)[0];
}

function extractState(addr: any): string | null {
  if (!addr || typeof addr !== 'object') return null;
  return (addr.state || addr.region || addr.province || null) as string | null;
}

/**
 * Real, verified delivery reviews:
 *  - review is approved
 *  - verified purchase
 *  - linked to a paid order
 *  - first name + state only (PII-safe public display)
 */
export function useDeliveryReviews(limit = 6) {
  return useQuery({
    queryKey: ['delivery-reviews', limit],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DeliveryReviewItem[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, rating, content, created_at, user_id,
          product:products(name),
          order_item:order_items(order:orders(shipping_address, payment_status))
        `)
        .eq('is_approved', true)
        .eq('is_verified_purchase', true)
        .not('content', 'is', null)
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .limit(limit * 4);

      if (error || !data) return [];

      const usable = data.filter((r: any) => {
        const ord = r.order_item?.order;
        const paid = ord?.payment_status === 'paid';
        const state = extractState(ord?.shipping_address);
        return paid && !!state && !!r.content && !!r.product?.name;
      });

      const userIds = Array.from(new Set(usable.map((r: any) => r.user_id)));
      let nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        (profs || []).forEach((p: any) => nameMap.set(p.id, p.full_name));
      }

      return usable.slice(0, limit).map((r: any) => ({
        id: r.id,
        firstName: firstNameOf(nameMap.get(r.user_id)),
        state: extractState(r.order_item.order.shipping_address) as string,
        rating: r.rating,
        comment: r.content as string,
        productName: r.product.name as string,
        createdAt: r.created_at,
      }));
    },
  });
}
