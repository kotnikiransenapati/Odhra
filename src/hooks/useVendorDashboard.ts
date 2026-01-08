import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorImpersonation } from '@/contexts/VendorImpersonationContext';

interface VendorStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  avgRating: number;
  totalReviews: number;
  totalViews: number;
  pendingBalance: number;
  availableBalance: number;
  thisMonthSales: number;
  lastMonthSales: number;
  salesGrowth: number;
  ordersGrowth: number;
}

interface VendorOrder {
  id: string;
  sub_order_number: string;
  order_id: string;
  status: string;
  total_amount: number;
  vendor_earnings: number;
  created_at: string;
  customer_name: string;
  customer_email: string;
  items_count: number;
}

interface VendorProduct {
  id: string;
  title: string;
  price: number;
  stock: number;
  sold_count: number;
  avg_rating: number;
  review_count: number;
  is_active: boolean;
  images: string[];
}

export function useVendorId() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating } = useVendorImpersonation();
  
  return useQuery({
    queryKey: ['vendor-id', user?.id, isImpersonating, impersonatedVendor?.id],
    queryFn: async () => {
      if (isImpersonating && impersonatedVendor?.id) {
        return impersonatedVendor.id;
      }
      
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data?.id;
    },
    enabled: !!user || isImpersonating,
  });
}

export function useVendorStats() {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-stats', vendorId],
    queryFn: async (): Promise<VendorStats> => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Fetch vendor details
      const { data: vendor } = await supabase
        .from('vendors')
        .select('balance, pending_balance')
        .eq('id', vendorId)
        .single();
      
      // Fetch products stats
      const { data: products } = await supabase
        .from('products')
        .select('id, stock, low_stock_threshold, is_active, avg_rating, review_count, view_count')
        .eq('vendor_id', vendorId);
      
      const totalProducts = products?.length || 0;
      const lowStockProducts = products?.filter(p => p.stock <= (p.low_stock_threshold || 5)).length || 0;
      const avgRating = products?.reduce((acc, p) => acc + (p.avg_rating || 0), 0) / (totalProducts || 1);
      const totalReviews = products?.reduce((acc, p) => acc + (p.review_count || 0), 0) || 0;
      const totalViews = products?.reduce((acc, p) => acc + (p.view_count || 0), 0) || 0;
      
      // Fetch sub_orders for this vendor
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('id, status, total_amount, vendor_earnings, created_at')
        .eq('vendor_id', vendorId);
      
      const totalSales = subOrders?.reduce((acc, o) => acc + (o.vendor_earnings || 0), 0) || 0;
      const totalOrders = subOrders?.length || 0;
      const pendingOrders = subOrders?.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length || 0;
      
      // This month's sales
      const thisMonthSales = subOrders
        ?.filter(o => new Date(o.created_at) >= startOfThisMonth)
        .reduce((acc, o) => acc + (o.vendor_earnings || 0), 0) || 0;
      
      // Last month's sales
      const lastMonthSales = subOrders
        ?.filter(o => {
          const date = new Date(o.created_at);
          return date >= startOfLastMonth && date <= endOfLastMonth;
        })
        .reduce((acc, o) => acc + (o.vendor_earnings || 0), 0) || 0;
      
      // Calculate growth
      const salesGrowth = lastMonthSales > 0 
        ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 
        : 0;
      
      const thisMonthOrders = subOrders?.filter(o => new Date(o.created_at) >= startOfThisMonth).length || 0;
      const lastMonthOrders = subOrders?.filter(o => {
        const date = new Date(o.created_at);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      }).length || 0;
      
      const ordersGrowth = lastMonthOrders > 0 
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
        : 0;
      
      return {
        totalSales,
        totalOrders,
        totalProducts,
        lowStockProducts,
        pendingOrders,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        totalViews,
        pendingBalance: vendor?.pending_balance || 0,
        availableBalance: vendor?.balance || 0,
        thisMonthSales,
        lastMonthSales,
        salesGrowth: Math.round(salesGrowth * 10) / 10,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
      };
    },
    enabled: !!vendorId,
    refetchInterval: 60000,
  });
}

export function useVendorOrders(limit = 10) {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-orders', vendorId, limit],
    queryFn: async (): Promise<VendorOrder[]> => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const { data: subOrders, error } = await supabase
        .from('sub_orders')
        .select(`
          id,
          sub_order_number,
          order_id,
          status,
          total_amount,
          vendor_earnings,
          created_at,
          orders!inner (
            customer_id,
            shipping_address
          ),
          order_items (id)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Get customer info for each order
      const orders = await Promise.all((subOrders || []).map(async (so: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', so.orders.customer_id)
          .single();
        
        const shippingAddress = so.orders.shipping_address as any;
        
        return {
          id: so.id,
          sub_order_number: so.sub_order_number,
          order_id: so.order_id,
          status: so.status,
          total_amount: so.total_amount,
          vendor_earnings: so.vendor_earnings,
          created_at: so.created_at,
          customer_name: profile?.full_name || shippingAddress?.name || 'Customer',
          customer_email: profile?.email || '',
          items_count: so.order_items?.length || 0,
        };
      }));
      
      return orders;
    },
    enabled: !!vendorId,
  });
}

export function useVendorProducts(limit?: number) {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-products', vendorId, limit],
    queryFn: async (): Promise<VendorProduct[]> => {
      if (!vendorId) throw new Error('No vendor ID');
      
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          stock,
          sold_count,
          avg_rating,
          review_count,
          is_active,
          product_images (url, is_primary)
        `)
        .eq('vendor_id', vendorId)
        .order('sold_count', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        stock: p.stock,
        sold_count: p.sold_count || 0,
        avg_rating: p.avg_rating || 0,
        review_count: p.review_count || 0,
        is_active: p.is_active,
        images: p.product_images
          ?.sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
          .map((img: any) => img.url) || [],
      }));
    },
    enabled: !!vendorId,
  });
}

export function useVendorSalesChart(days = 30) {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-sales-chart', vendorId, days],
    queryFn: async () => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: subOrders, error } = await supabase
        .from('sub_orders')
        .select('created_at, vendor_earnings, total_amount')
        .eq('vendor_id', vendorId)
        .gte('created_at', startDate.toISOString())
        .order('created_at');
      
      if (error) throw error;
      
      // Group by date
      const salesByDate: Record<string, { sales: number; orders: number }> = {};
      
      (subOrders || []).forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!salesByDate[date]) {
          salesByDate[date] = { sales: 0, orders: 0 };
        }
        salesByDate[date].sales += order.vendor_earnings || 0;
        salesByDate[date].orders += 1;
      });
      
      // Fill in missing dates
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          sales: salesByDate[dateStr]?.sales || 0,
          orders: salesByDate[dateStr]?.orders || 0,
        });
      }
      
      return result;
    },
    enabled: !!vendorId,
  });
}

export function useVendorReviews(limit = 10) {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-reviews', vendorId, limit],
    queryFn: async () => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('vendor_id', vendorId);
      
      const productIds = products?.map(p => p.id) || [];
      
      if (productIds.length === 0) return [];
      
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          is_verified_purchase,
          vendor_reply,
          created_at,
          products (id, title),
          profiles!reviews_user_id_fkey (full_name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return reviews?.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isVerifiedPurchase: r.is_verified_purchase,
        vendorReply: r.vendor_reply,
        createdAt: r.created_at,
        productTitle: r.products?.title,
        customerName: r.profiles?.full_name || 'Customer',
      })) || [];
    },
    enabled: !!vendorId,
  });
}

export function useVendorPayouts() {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-payouts', vendorId],
    queryFn: async () => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });
}

export function useVendorTransactions(limit = 20) {
  const { data: vendorId } = useVendorId();
  
  return useQuery({
    queryKey: ['vendor-transactions', vendorId, limit],
    queryFn: async () => {
      if (!vendorId) throw new Error('No vendor ID');
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });
}

// Combined hook for vendor dashboard
export function useVendorDashboard() {
  const { data: vendorId } = useVendorId();
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useVendorStats();
  const { data: recentOrders, isLoading: ordersLoading, refetch: refetchOrders } = useVendorOrders(5);
  const { data: allProducts, isLoading: productsLoading } = useVendorProducts();
  const { data: reviews, isLoading: reviewsLoading, refetch: refetchReviews } = useVendorReviews(5);
  
  // Get low stock products
  const lowStockProducts = allProducts?.filter(p => 
    p.stock <= 10 && p.is_active
  ).map(p => ({
    id: p.id,
    title: p.title,
    stock: p.stock,
    sku: null as string | null,
    low_stock_threshold: 10,
    primary_image: p.images?.[0] || null,
  })) || [];

  // Format recent orders for dashboard
  const formattedOrders = recentOrders?.map(order => ({
    id: order.id,
    sub_order_number: order.sub_order_number,
    status: order.status,
    total_amount: order.total_amount,
    order_items: Array(order.items_count).fill({}),
  })) || [];

  // Format reviews for dashboard
  const formattedReviews = reviews?.map(r => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    content: r.content,
    is_verified_purchase: r.isVerifiedPurchase,
    vendor_reply: r.vendorReply,
    created_at: r.createdAt,
  })) || [];

  const refetch = () => {
    refetchStats();
    refetchOrders();
    refetchReviews();
  };

  return {
    stats: statsData ? {
      totalSales: statsData.thisMonthSales,
      totalOrders: statsData.totalOrders,
      totalProducts: statsData.totalProducts,
      pendingOrders: statsData.pendingOrders,
    } : null,
    recentOrders: formattedOrders,
    lowStockProducts,
    recentReviews: formattedReviews,
    payoutInfo: statsData ? {
      available: statsData.availableBalance,
      pending: statsData.pendingBalance,
    } : null,
    isLoading: statsLoading || ordersLoading || productsLoading || reviewsLoading,
    refetch,
  };
}
