import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Comprehensive analytics hook for god-level admin panel
export interface AdvancedStats {
  // Revenue metrics
  totalRevenue: number;
  revenueGrowth: number;
  avgOrderValue: number;
  avgOrderValueGrowth: number;
  
  // Order metrics
  totalOrders: number;
  ordersGrowth: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  
  // Customer metrics
  totalCustomers: number;
  newCustomers: number;
  customersGrowth: number;
  repeatCustomerRate: number;
  
  // Vendor metrics
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  
  // Product metrics
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  
  // Financial metrics
  totalCommission: number;
  pendingPayouts: number;
  totalPayoutAmount: number;
  grossProfit: number;
  
  // Conversion metrics
  conversionRate: number;
  cartAbandonmentRate: number;
}

export function useAdvancedAnalytics(dateRange: '7d' | '30d' | '90d' | '365d' = '30d') {
  return useQuery({
    queryKey: ['admin-advanced-analytics', dateRange],
    queryFn: async (): Promise<AdvancedStats> => {
      const now = new Date();
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
      const days = daysMap[dateRange];
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Current period orders
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, status, payment_status, customer_id, created_at, subtotal, discount_amount, shipping_amount')
        .gte('created_at', startDate.toISOString());

      // Previous period orders for comparison
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_amount, customer_id')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // All time orders for repeat customer analysis
      const { data: allOrders } = await supabase
        .from('orders')
        .select('customer_id')
        .in('payment_status', ['paid', 'escrow']);

      // Current paid orders only
      const paidOrders = currentOrders?.filter(o => ['paid', 'escrow'].includes(o.payment_status)) || [];
      const prevPaidOrders = prevOrders || [];

      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const prevRevenue = prevPaidOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
      const prevAvgOrderValue = prevPaidOrders.length > 0 
        ? prevPaidOrders.reduce((sum, o) => sum + o.total_amount, 0) / prevPaidOrders.length 
        : 0;
      const avgOrderValueGrowth = prevAvgOrderValue > 0 
        ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 
        : 0;

      // Order status breakdown
      const pendingOrders = currentOrders?.filter(o => o.status === 'pending').length || 0;
      const processingOrders = currentOrders?.filter(o => ['confirmed', 'processing'].includes(o.status)).length || 0;
      const shippedOrders = currentOrders?.filter(o => o.status === 'shipped').length || 0;
      const deliveredOrders = currentOrders?.filter(o => o.status === 'delivered').length || 0;
      const cancelledOrders = currentOrders?.filter(o => o.status === 'cancelled').length || 0;

      // Customer metrics
      const { count: totalCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: newCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: prevNewCustomers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const customersGrowth = (prevNewCustomers || 0) > 0 
        ? (((newCustomers || 0) - (prevNewCustomers || 0)) / (prevNewCustomers || 1)) * 100 
        : 0;

      // Repeat customer rate
      const customerOrderCounts: Record<string, number> = {};
      allOrders?.forEach(o => {
        customerOrderCounts[o.customer_id] = (customerOrderCounts[o.customer_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;
      const repeatCustomerRate = Object.keys(customerOrderCounts).length > 0 
        ? (repeatCustomers / Object.keys(customerOrderCounts).length) * 100 
        : 0;

      // Vendor metrics
      const { count: totalVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      const { count: activeVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_verified', true);

      const { count: pendingVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      // Product metrics
      const { data: products } = await supabase
        .from('products')
        .select('id, is_active, stock, low_stock_threshold');

      const totalProducts = products?.length || 0;
      const activeProducts = products?.filter(p => p.is_active).length || 0;
      const lowStockProducts = products?.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold || 5)).length || 0;
      const outOfStockProducts = products?.filter(p => p.stock <= 0).length || 0;

      // Commission calculations from sub_orders
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('commission_amount, vendor_earnings')
        .gte('created_at', startDate.toISOString());

      const totalCommission = subOrders?.reduce((sum, so) => sum + (so.commission_amount || 0), 0) || 0;

      // Payout metrics
      const { data: payouts } = await supabase
        .from('payout_requests')
        .select('amount, status');

      const pendingPayouts = payouts?.filter(p => p.status === 'pending').length || 0;
      const totalPayoutAmount = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;

      // Gross profit (Revenue - vendor earnings)
      const vendorEarnings = subOrders?.reduce((sum, so) => sum + (so.vendor_earnings || 0), 0) || 0;
      const grossProfit = totalRevenue - vendorEarnings;

      // Conversion rate (orders / carts)
      const { count: totalCarts } = await supabase
        .from('carts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const conversionRate = (totalCarts || 0) > 0 
        ? (paidOrders.length / (totalCarts || 1)) * 100 
        : 0;

      // Cart abandonment
      const { data: abandonedCarts } = await supabase
        .from('carts')
        .select('id, items')
        .gte('created_at', startDate.toISOString());

      const cartsWithItems = abandonedCarts?.filter(c => {
        const items = c.items as unknown[];
        return Array.isArray(items) && items.length > 0;
      }).length || 0;

      const cartAbandonmentRate = cartsWithItems > 0 
        ? ((cartsWithItems - paidOrders.length) / cartsWithItems) * 100 
        : 0;

      return {
        totalRevenue,
        revenueGrowth,
        avgOrderValue,
        avgOrderValueGrowth,
        totalOrders: currentOrders?.length || 0,
        ordersGrowth: prevPaidOrders.length > 0 
          ? ((paidOrders.length - prevPaidOrders.length) / prevPaidOrders.length) * 100 
          : 0,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers: totalCustomers || 0,
        newCustomers: newCustomers || 0,
        customersGrowth,
        repeatCustomerRate,
        totalVendors: totalVendors || 0,
        activeVendors: activeVendors || 0,
        pendingVendors: pendingVendors || 0,
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalCommission,
        pendingPayouts,
        totalPayoutAmount,
        grossProfit,
        conversionRate,
        cartAbandonmentRate: Math.max(0, cartAbandonmentRate),
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useRevenueByPeriod(dateRange: '7d' | '30d' | '90d' | '365d' = '30d') {
  return useQuery({
    queryKey: ['admin-revenue-by-period', dateRange],
    queryFn: async () => {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
      const days = daysMap[dateRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_amount, subtotal, discount_amount, shipping_amount')
        .gte('created_at', startDate.toISOString())
        .in('payment_status', ['paid', 'escrow']);

      // Get commission data
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('created_at, commission_amount, vendor_earnings')
        .gte('created_at', startDate.toISOString());

      const dailyData: Record<string, { 
        revenue: number; 
        orders: number; 
        commission: number;
        vendorEarnings: number;
      }> = {};

      orders?.forEach((order) => {
        const date = order.created_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0, commission: 0, vendorEarnings: 0 };
        }
        dailyData[date].revenue += order.total_amount;
        dailyData[date].orders += 1;
      });

      subOrders?.forEach((so) => {
        const date = so.created_at.split('T')[0];
        if (dailyData[date]) {
          dailyData[date].commission += so.commission_amount || 0;
          dailyData[date].vendorEarnings += so.vendor_earnings || 0;
        }
      });

      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          revenue: dailyData[dateStr]?.revenue || 0,
          orders: dailyData[dateStr]?.orders || 0,
          commission: dailyData[dateStr]?.commission || 0,
          profit: (dailyData[dateStr]?.revenue || 0) - (dailyData[dateStr]?.vendorEarnings || 0),
        });
      }

      return result;
    },
  });
}

export function useTopPerformers() {
  return useQuery({
    queryKey: ['admin-top-performers'],
    queryFn: async () => {
      // Top products by revenue
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_title, total_price, quantity');

      const productSales: Record<string, { title: string; revenue: number; quantity: number }> = {};
      orderItems?.forEach(item => {
        if (item.product_id) {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = { title: item.product_title, revenue: 0, quantity: 0 };
          }
          productSales[item.product_id].revenue += item.total_price;
          productSales[item.product_id].quantity += item.quantity;
        }
      });

      const topProducts = Object.entries(productSales)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Top vendors by revenue
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('vendor_id, total_amount, commission_amount');

      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name');

      const vendorSales: Record<string, { revenue: number; commission: number; orders: number }> = {};
      subOrders?.forEach(so => {
        if (!vendorSales[so.vendor_id]) {
          vendorSales[so.vendor_id] = { revenue: 0, commission: 0, orders: 0 };
        }
        vendorSales[so.vendor_id].revenue += so.total_amount;
        vendorSales[so.vendor_id].commission += so.commission_amount || 0;
        vendorSales[so.vendor_id].orders += 1;
      });

      const topVendors = Object.entries(vendorSales)
        .map(([id, data]) => {
          const vendor = vendors?.find(v => v.id === id);
          return { id, name: vendor?.brand_name || 'Unknown', ...data };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Top customers by spending
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total_amount')
        .in('payment_status', ['paid', 'escrow']);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const customerSpending: Record<string, { spending: number; orders: number }> = {};
      orders?.forEach(order => {
        if (!customerSpending[order.customer_id]) {
          customerSpending[order.customer_id] = { spending: 0, orders: 0 };
        }
        customerSpending[order.customer_id].spending += order.total_amount;
        customerSpending[order.customer_id].orders += 1;
      });

      const topCustomers = Object.entries(customerSpending)
        .map(([id, data]) => {
          const profile = profiles?.find(p => p.id === id);
          return { 
            id, 
            name: profile?.full_name || 'Unknown', 
            email: profile?.email || '',
            ...data 
          };
        })
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 10);

      // Category breakdown
      const { data: products } = await supabase
        .from('products')
        .select('id, category_id');

      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');

      const productCategoryMap: Record<string, string> = {};
      products?.forEach(p => {
        if (p.category_id) productCategoryMap[p.id] = p.category_id;
      });

      const categorySales: Record<string, number> = {};
      orderItems?.forEach(item => {
        if (item.product_id && productCategoryMap[item.product_id]) {
          const catId = productCategoryMap[item.product_id];
          categorySales[catId] = (categorySales[catId] || 0) + item.total_price;
        }
      });

      const categoryBreakdown = Object.entries(categorySales)
        .map(([id, revenue]) => {
          const category = categories?.find(c => c.id === id);
          return { id, name: category?.name || 'Uncategorized', revenue };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      return { topProducts, topVendors, topCustomers, categoryBreakdown };
    },
  });
}

export function useOrderStatusChart() {
  return useQuery({
    queryKey: ['admin-order-status-chart'],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('status');

      const statusCounts: Record<string, number> = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0,
      };

      orders?.forEach(order => {
        if (statusCounts[order.status] !== undefined) {
          statusCounts[order.status]++;
        }
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
      }));
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const activities: Array<{
        id: string;
        type: 'order' | 'review' | 'vendor' | 'payout';
        title: string;
        description: string;
        timestamp: string;
      }> = [];

      // Recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentOrders?.forEach(order => {
        activities.push({
          id: order.id,
          type: 'order',
          title: `New Order ${order.order_number}`,
          description: `₹${order.total_amount.toLocaleString('en-IN')}`,
          timestamp: order.created_at,
        });
      });

      // Recent reviews
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('id, rating, created_at, product_id')
        .order('created_at', { ascending: false })
        .limit(5);

      recentReviews?.forEach(review => {
        activities.push({
          id: review.id,
          type: 'review',
          title: `New Review`,
          description: `${review.rating} star rating`,
          timestamp: review.created_at,
        });
      });

      // Recent vendor applications
      const { data: recentVendors } = await supabase
        .from('vendors')
        .select('id, brand_name, created_at, is_verified')
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(5);

      recentVendors?.forEach(vendor => {
        activities.push({
          id: vendor.id,
          type: 'vendor',
          title: `Vendor Application`,
          description: vendor.brand_name,
          timestamp: vendor.created_at,
        });
      });

      // Recent payout requests
      const { data: recentPayouts } = await supabase
        .from('payout_requests')
        .select('id, amount, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      recentPayouts?.forEach(payout => {
        activities.push({
          id: payout.id,
          type: 'payout',
          title: `Payout Request`,
          description: `₹${payout.amount.toLocaleString('en-IN')}`,
          timestamp: payout.created_at,
        });
      });

      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 15);
    },
    refetchInterval: 30000,
  });
}
