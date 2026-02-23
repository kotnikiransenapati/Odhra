import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_slug: string | null;
  product_title: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info: Record<string, string> | null;
}

export interface SubOrder {
  id: string;
  sub_order_number: string;
  vendor_id: string;
  vendor_name?: string;
  status: string;
  subtotal: number;
  shipping_amount: number | null;
  tax_amount: number | null;
  total_amount: number;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: OrderItem[];
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_amount: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  created_at: string;
  updated_at: string;
  sub_orders: SubOrder[];
}

export function useOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
      if (!user) return [];

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }
      if (!orders || orders.length === 0) return [];

      // Fetch sub-orders for all orders
      const orderIds = orders.map((o) => o.id);
      const { data: subOrders, error: subOrdersError } = await supabase
        .from('sub_orders')
        .select('*')
        .in('order_id', orderIds);

      if (subOrdersError) {
        console.error('Error fetching sub_orders:', subOrdersError);
        throw subOrdersError;
      }

      // Fetch order items for all sub-orders with product slugs
      const subOrderIds = subOrders?.map((so) => so.id) || [];
      let orderItems: any[] = [];
      if (subOrderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*, products(slug)')
          .in('sub_order_id', subOrderIds);

        if (itemsError) {
          console.error('Error fetching order_items:', itemsError);
          throw itemsError;
        }
        orderItems = items || [];
      }

      // Fetch vendor names
      const vendorIds = [...new Set(subOrders?.map((so) => so.vendor_id) || [])];
      let vendors: any[] = [];
      if (vendorIds.length > 0) {
        const { data: v } = await supabase
          .from('vendors')
          .select('id, brand_name')
          .in('id', vendorIds);
        vendors = v || [];
      }

      // Combine data
      return orders.map((order) => {
        const orderSubOrders = subOrders?.filter((so) => so.order_id === order.id) || [];

        return {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          subtotal: order.subtotal,
          shipping_amount: order.shipping_amount,
          tax_amount: order.tax_amount,
          discount_amount: order.discount_amount,
          total_amount: order.total_amount,
          shipping_address: order.shipping_address as Order['shipping_address'],
          created_at: order.created_at,
          updated_at: order.updated_at,
          sub_orders: orderSubOrders.map((so) => {
            const vendor = vendors.find((v: any) => v.id === so.vendor_id);
            const items = orderItems.filter((item: any) => item.sub_order_id === so.id);

            return {
              id: so.id,
              sub_order_number: so.sub_order_number,
              vendor_id: so.vendor_id,
              vendor_name: vendor?.brand_name,
              status: so.status,
              subtotal: so.subtotal,
              shipping_amount: so.shipping_amount,
              tax_amount: so.tax_amount,
              total_amount: so.total_amount,
              tracking_number: so.tracking_number,
              tracking_url: so.tracking_url,
              carrier: so.carrier,
              shipped_at: so.shipped_at,
              delivered_at: so.delivered_at,
              items: items.map((item: any) => ({
                id: item.id,
                product_id: item.product_id,
                product_slug: item.products?.slug || null,
                product_title: item.product_title,
                product_image: item.product_image,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                variant_info: item.variant_info as Record<string, string> | null,
              })),
            };
          }),
        };
      });
    },
    enabled: !!user,
    retry: 2,
  });
}

export function useOrdersCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orders-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
