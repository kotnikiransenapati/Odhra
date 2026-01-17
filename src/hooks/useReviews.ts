import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateReviewData {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Fetch profiles for all review user_ids
      const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      // Combine reviews with profiles
      return reviewsData.map((review) => ({
        ...review,
        profiles: profilesMap.get(review.user_id) || null,
      })) as Review[];
    },
    enabled: !!productId,
  });
}

export function useUserReview(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-review', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!productId && !!user,
  });
}

export function useCanReview(productId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-review', productId, user?.id],
    queryFn: async () => {
      if (!user) return { canReview: false, hasPurchased: false };

      // Check if user has purchased this product (any paid order, not just delivered)
      // Users should be able to review after purchase, not just after delivery
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          id,
          sub_orders!inner (
            id,
            status,
            orders!inner (
              customer_id,
              payment_status
            )
          )
        `)
        .eq('product_id', productId)
        .eq('sub_orders.orders.customer_id', user.id);

      if (error) throw error;

      // Consider purchase valid if payment is completed (paid/escrow) and order is not cancelled/refunded
      const validPurchase = orderItems?.some(item => {
        const subOrder = item.sub_orders as any;
        const order = subOrder?.orders;
        const paymentStatus = order?.payment_status;
        const orderStatus = subOrder?.status;
        
        // Valid if paid and not cancelled/refunded
        const isPaid = paymentStatus === 'paid' || paymentStatus === 'escrow';
        const isNotCancelled = orderStatus !== 'cancelled' && orderStatus !== 'refunded';
        
        return isPaid && isNotCancelled;
      }) || false;

      // Check if user already reviewed
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        canReview: validPurchase && !existingReview,
        hasPurchased: validPurchase,
        hasReviewed: !!existingReview,
      };
    },
    enabled: !!productId && !!user,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateReviewData) => {
      if (!user) throw new Error('Must be logged in to review');

      // Check if this is a verified purchase
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id,
          sub_orders!inner (
            status,
            orders!inner (
              customer_id
            )
          )
        `)
        .eq('product_id', data.product_id)
        .eq('sub_orders.orders.customer_id', user.id)
        .eq('sub_orders.status', 'delivered')
        .limit(1);

      const isVerifiedPurchase = (orderItems?.length || 0) > 0;

      const { data: review, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          product_id: data.product_id,
          rating: data.rating,
          title: data.title || null,
          content: data.content || null,
          images: data.images || [],
          is_verified_purchase: isVerifiedPurchase,
          is_approved: false, // Needs moderation
        })
        .select()
        .single();

      if (error) throw error;
      return review;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['user-review', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['can-review', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, ...data }: { reviewId: string } & Partial<CreateReviewData>) => {
      const { data: review, error } = await supabase
        .from('reviews')
        .update({
          rating: data.rating,
          title: data.title,
          content: data.content,
          images: data.images,
          is_approved: false, // Re-submit for moderation
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return review;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', data.product_id] });
      queryClient.invalidateQueries({ queryKey: ['user-review', data.product_id] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, productId }: { reviewId: string; productId: string }) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      return { productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['can-review', data.productId] });
    },
  });
}

export function useReviewStats(productId: string) {
  return useQuery({
    queryKey: ['review-stats', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);

      if (error) throw error;

      const total = data?.length || 0;
      const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
      let sum = 0;

      data?.forEach((review) => {
        distribution[review.rating - 1]++;
        sum += review.rating;
      });

      return {
        total,
        average: total > 0 ? sum / total : 0,
        distribution,
      };
    },
    enabled: !!productId,
  });
}
