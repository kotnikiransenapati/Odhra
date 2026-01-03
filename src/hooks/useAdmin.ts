import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vendor {
  id: string;
  user_id: string | null;
  brand_name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  commission_rate: number;
  balance: number;
  pending_balance: number;
  gst_number: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export interface PayoutRequest {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  amount: number;
  payment_method: string;
  bank_details: Record<string, string> | null;
  status: string;
  admin_note: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  activeVendors: number;
  pendingVendors: number;
  totalProducts: number;
  pendingPayouts: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      // Get total revenue from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .in('payment_status', ['paid', 'escrow']);

      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;

      // Get vendor counts
      const { count: activeVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_verified', true);

      const { count: pendingVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      // Get product count
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get pending payouts
      const { count: pendingPayouts } = await supabase
        .from('payout_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalRevenue,
        totalOrders,
        activeVendors: activeVendors || 0,
        pendingVendors: pendingVendors || 0,
        totalProducts: totalProducts || 0,
        pendingPayouts: pendingPayouts || 0,
      };
    },
  });
}

export function useAdminVendors() {
  return useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails for vendors
      const vendorsWithEmail = await Promise.all(
        (data || []).map(async (vendor) => {
          if (vendor.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', vendor.user_id)
              .single();
            return { ...vendor, user_email: profile?.email };
          }
          return vendor;
        })
      );

      return vendorsWithEmail;
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendorId,
      updates,
    }: {
      vendorId: string;
      updates: Partial<Vendor>;
    }) => {
      const { error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vendor');
      console.error(error);
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get customer info
      const customerIds = [...new Set(orders?.map((o) => o.customer_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', customerIds);

      return (orders || []).map((order) => {
        const customer = profiles?.find((p) => p.id === order.customer_id);
        return {
          ...order,
          customer_name: customer?.full_name || 'Unknown',
          customer_email: customer?.email || '',
        };
      });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      updates,
      trackingInfo,
    }: {
      orderId: string;
      updates: {
        status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
        payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'escrow';
        admin_note?: string;
      };
      trackingInfo?: {
        trackingNumber?: string;
        carrier?: string;
      };
    }) => {
      // Get current order for comparison and customer info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, status')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const previousStatus = order.status;
      
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Send email notifications for status changes
      if (updates.status && updates.status !== previousStatus) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', order.customer_id)
            .single();

          if (profile?.email) {
            let emailType: 'shipping_update' | 'order_delivered' | null = null;
            
            if (updates.status === 'shipped') {
              emailType = 'shipping_update';
            } else if (updates.status === 'delivered') {
              emailType = 'order_delivered';
            }

            if (emailType) {
              const siteUrl = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.lovable.app') || window.location.origin;
              
              await supabase.functions.invoke('send-email', {
                body: {
                  type: emailType,
                  to: profile.email,
                  data: {
                    orderNumber: order.order_number,
                    customerName: profile.full_name || 'Customer',
                    total: order.total_amount,
                    trackingNumber: trackingInfo?.trackingNumber,
                    carrier: trackingInfo?.carrier,
                    trackingUrl: `${siteUrl}/account/orders/${orderId}`,
                    reviewUrl: `${siteUrl}/account/orders/${orderId}`,
                    shopUrl: `${siteUrl}/shop`,
                    deliveredAt: updates.status === 'delivered' ? new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }) : undefined,
                  },
                },
              });
              console.log(`${emailType} email sent to:`, profile.email);
            }
          }
        } catch (emailError) {
          console.error('Failed to send status update email:', emailError);
          // Don't throw - email failure shouldn't fail the update
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update order');
      console.error(error);
    },
  });
}

export function useAdminPayouts() {
  return useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async (): Promise<PayoutRequest[]> => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get vendor names
      const vendorIds = [...new Set(data?.map((p) => p.vendor_id) || [])];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name')
        .in('id', vendorIds);

      return (data || []).map((payout) => {
        const vendor = vendors?.find((v) => v.id === payout.vendor_id);
        return {
          ...payout,
          vendor_name: vendor?.brand_name || 'Unknown',
          bank_details: payout.bank_details as Record<string, string> | null,
        };
      });
    },
  });
}

export function useProcessPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payoutId,
      status,
      adminNote,
    }: {
      payoutId: string;
      status: 'approved' | 'rejected';
      adminNote?: string;
    }) => {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status,
          admin_note: adminNote,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (error) throw error;

      // If approved, update vendor balance
      if (status === 'approved') {
        const { data: payout } = await supabase
          .from('payout_requests')
          .select('vendor_id, amount')
          .eq('id', payoutId)
          .single();

        if (payout) {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('balance')
            .eq('id', payout.vendor_id)
            .single();

          if (vendor) {
            await supabase
              .from('vendors')
              .update({ balance: Math.max(0, vendor.balance - payout.amount) })
              .eq('id', payout.vendor_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Payout processed successfully');
    },
    onError: (error) => {
      toast.error('Failed to process payout');
      console.error(error);
    },
  });
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ['admin-revenue-chart'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // Group by date
      const dailyRevenue: Record<string, number> = {};
      orders?.forEach((order) => {
        const date = order.created_at.split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total_amount;
      });

      // Generate last 30 days
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          revenue: dailyRevenue[dateStr] || 0,
        });
      }

      return result;
    },
  });
}

export interface PendingReview {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
  product_title?: string;
  product_image?: string;
  vendor_name?: string;
}

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async (): Promise<PendingReview[]> => {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!reviews || reviews.length === 0) return [];

      // Get user profiles
      const userIds = [...new Set(reviews.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Get products with vendor info
      const productIds = [...new Set(reviews.map((r) => r.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          title,
          vendor_id,
          product_images (url, is_primary)
        `)
        .in('id', productIds);

      // Get vendors
      const vendorIds = [...new Set(products?.map((p) => p.vendor_id) || [])];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name')
        .in('id', vendorIds);

      return reviews.map((review) => {
        const profile = profiles?.find((p) => p.id === review.user_id);
        const product = products?.find((p) => p.id === review.product_id);
        const vendor = vendors?.find((v) => v.id === product?.vendor_id);
        const primaryImage = product?.product_images?.find((img) => img.is_primary) || product?.product_images?.[0];

        return {
          ...review,
          user_name: profile?.full_name || 'Unknown',
          user_email: profile?.email || '',
          product_title: product?.title || 'Unknown Product',
          product_image: primaryImage?.url || '/placeholder.svg',
          vendor_name: vendor?.brand_name || 'Unknown Vendor',
        };
      });
    },
  });
}

export function usePendingReviewsCount() {
  return useQuery({
    queryKey: ['admin-pending-reviews-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      action,
    }: {
      reviewId: string;
      action: 'approve' | 'reject';
    }) => {
      if (action === 'approve') {
        const { error } = await supabase
          .from('reviews')
          .update({ is_approved: true })
          .eq('id', reviewId);

        if (error) throw error;

        // Update product avg_rating and review_count
        const { data: review } = await supabase
          .from('reviews')
          .select('product_id, rating')
          .eq('id', reviewId)
          .single();

        if (review) {
          const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', review.product_id)
            .eq('is_approved', true);

          const avgRating = allReviews && allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

          await supabase
            .from('products')
            .update({
              avg_rating: avgRating,
              review_count: allReviews?.length || 0,
            })
            .eq('id', review.product_id);
        }
      } else {
        // Delete rejected review
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-reviews-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(action === 'approve' ? 'Review approved' : 'Review rejected');
    },
    onError: (error) => {
      toast.error('Failed to moderate review');
      console.error(error);
    },
  });
}
