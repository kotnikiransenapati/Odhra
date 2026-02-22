import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Truck,
  MapPin,
  Clock,
  Box,
  FileCheck,
  ExternalLink,
} from 'lucide-react';

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  icon: React.ElementType;
  timestamp: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
}

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const statusConfig: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  pending: { label: 'Order Placed', description: 'Your order has been received', icon: FileCheck },
  confirmed: { label: 'Confirmed', description: 'Order confirmed by seller', icon: CheckCircle },
  processing: { label: 'Processing', description: 'Your order is being prepared', icon: Box },
  shipped: { label: 'Shipped', description: 'Your order is on the way', icon: Truck },
  delivered: { label: 'Delivered', description: 'Order has been delivered', icon: MapPin },
  cancelled: { label: 'Cancelled', description: 'Order has been cancelled', icon: Clock },
  refunded: { label: 'Refunded', description: 'Order has been refunded', icon: Clock },
};

export default function OrderTracking() {
  const { orderId } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-tracking', orderId],
    queryFn: async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: subOrders, error: subOrdersError } = await supabase
        .from('sub_orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('order_id', orderId);

      if (subOrdersError) throw subOrdersError;

      // Get vendor info for sub-orders
      const vendorIds = [...new Set(subOrders.map(so => so.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name, logo_url')
        .in('id', vendorIds);

      const vendorMap = new Map(vendors?.map(v => [v.id, v]) || []);

      return {
        ...orderData,
        sub_orders: subOrders.map(so => ({
          ...so,
          vendor: vendorMap.get(so.vendor_id),
        })),
      };
    },
    enabled: !!orderId,
  });

  const buildTimeline = (status: string, createdAt: string, shippedAt?: string, deliveredAt?: string): TimelineStep[] => {
    const currentIndex = statusOrder.indexOf(status);
    
    return statusOrder.map((s, index) => {
      const config = statusConfig[s];
      let timestamp: string | null = null;
      
      if (s === 'pending') timestamp = createdAt;
      else if (s === 'shipped' && shippedAt) timestamp = shippedAt;
      else if (s === 'delivered' && deliveredAt) timestamp = deliveredAt;
      else if (index <= currentIndex) timestamp = createdAt; // Approximate

      return {
        status: s,
        label: config.label,
        description: config.description,
        icon: config.icon,
        timestamp,
        isCompleted: index < currentIndex,
        isCurrent: index === currentIndex,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Button asChild>
              <Link to="/orders">View All Orders</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/orders" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Orders
              </Link>
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Track Order</h1>
                <p className="text-muted-foreground">
                  Order #{order.order_number} • Placed on {format(new Date(order.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  order.status === 'delivered'
                    ? 'bg-success/10 text-success border-success/30'
                    : order.status === 'shipped'
                    ? 'bg-info/10 text-info border-info/30'
                    : 'bg-warning/10 text-warning border-warning/30'
                }
              >
                {statusConfig[order.status]?.label || order.status}
              </Badge>
            </div>
          </motion.div>

          {/* Sub-orders with individual tracking */}
          {order.sub_orders?.map((subOrder: any, index: number) => {
            const timeline = buildTimeline(
              subOrder.status,
              subOrder.created_at,
              subOrder.shipped_at,
              subOrder.delivered_at
            );

            return (
              <motion.div
                key={subOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {subOrder.vendor?.logo_url ? (
                          <img
                            src={subOrder.vendor.logo_url}
                            alt={subOrder.vendor.brand_name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-accent" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {subOrder.vendor?.brand_name || 'Vendor'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Sub-order #{subOrder.sub_order_number}
                          </p>
                        </div>
                      </div>
                      {subOrder.tracking_url && (
                        <Button variant="outline" size="sm" asChild className="gap-2">
                          <a href={subOrder.tracking_url} target="_blank" rel="noopener noreferrer">
                            Track with Carrier <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {subOrder.tracking_number && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Tracking Number:</span>{' '}
                          <span className="font-mono font-medium">{subOrder.tracking_number}</span>
                          {subOrder.carrier && (
                            <span className="text-muted-foreground ml-2">via {subOrder.carrier}</span>
                          )}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Timeline */}
                    <div className="relative">
                      {timeline.map((step, stepIndex) => {
                        const Icon = step.icon;
                        const isLast = stepIndex === timeline.length - 1;

                        return (
                          <div key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
                            {/* Vertical line */}
                            {!isLast && (
                              <div
                                className={`absolute left-5 top-10 w-0.5 h-full -translate-x-1/2 ${
                                  step.isCompleted ? 'bg-accent' : 'bg-border'
                                }`}
                              />
                            )}
                            
                            {/* Icon */}
                            <div
                              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                step.isCompleted
                                  ? 'bg-accent text-accent-foreground'
                                  : step.isCurrent
                                  ? 'bg-accent/20 text-accent border-2 border-accent'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 pt-1">
                              <p
                                className={`font-medium ${
                                  step.isCompleted || step.isCurrent
                                    ? 'text-foreground'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {step.description}
                              </p>
                              {step.timestamp && (step.isCompleted || step.isCurrent) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(step.timestamp), 'MMM d, yyyy h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Items in this sub-order */}
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-medium mb-3">Items in this shipment</p>
                      <div className="space-y-2">
                        {subOrder.order_items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product_title}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
