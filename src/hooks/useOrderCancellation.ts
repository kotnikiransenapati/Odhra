import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const CANCELLATION_REASONS = [
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'found_cheaper', label: 'Found a better price elsewhere' },
  { value: 'wrong_item', label: 'Ordered wrong item/variant' },
  { value: 'delivery_too_long', label: 'Delivery time is too long' },
  { value: 'duplicate_order', label: 'Duplicate order placed' },
  { value: 'payment_issue', label: 'Payment/billing issue' },
  { value: 'other', label: 'Other reason' },
] as const;

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

export function canCancelOrder(orderStatus: string): boolean {
  return CANCELLABLE_STATUSES.includes(orderStatus);
}

export function useOrderCancellation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cancelOrder = useMutation({
    mutationFn: async ({
      orderId,
      reason,
      reasonCategory,
      additionalComments,
    }: {
      orderId: string;
      reason: string;
      reasonCategory: string;
      additionalComments?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // 1. Verify order belongs to user and is cancellable
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, total_amount, customer_id')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (orderError || !order) throw new Error('Order not found');
      if (!canCancelOrder(order.status)) {
        throw new Error(`Cannot cancel order with status "${order.status}". Only pending, confirmed, or processing orders can be cancelled.`);
      }

      // 2. Create cancellation record
      const { error: cancelError } = await supabase
        .from('order_cancellations')
        .insert({
          order_id: orderId,
          customer_id: user.id,
          reason,
          reason_category: reasonCategory,
          additional_comments: additionalComments || null,
          refund_amount: order.total_amount,
          status: 'approved', // Auto-approve for pre-shipment cancellations
          refund_status: 'pending',
        });

      if (cancelError) throw cancelError;

      // 3. Update order status to cancelled
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' as any })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 4. Update all sub-orders to cancelled
      const { error: subOrderError } = await supabase
        .from('sub_orders')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId);

      if (subOrderError) throw subOrderError;

      // 5. Restore stock for cancelled items
      try {
        await supabase.rpc('restore_order_stock', { p_order_id: orderId });
      } catch (stockError) {
        console.error('Stock restoration failed (non-critical):', stockError);
      }

      return { success: true, refundAmount: order.total_amount };
    },
    onSuccess: (data) => {
      toast.success('Order cancelled successfully. Refund will be processed within 5-7 business days.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });

  return { cancelOrder };
}
