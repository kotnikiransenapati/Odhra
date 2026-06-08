import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShipment, useShipmentEvents, useShipmentRealtime } from '@/hooks/useShipments';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Package, CheckCircle, Truck, MapPin, Clock,
  Box, FileCheck, ExternalLink, Navigation, Milestone, Radio, Copy, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';

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

function ShipmentTimeline({ subOrderId }: { subOrderId: string }) {
  const { data: shipment } = useShipment(subOrderId);
  const { data: events = [] } = useShipmentEvents(shipment?.id);
  useShipmentRealtime(shipment?.id);

  if (!shipment) return null;

  const shipmentSteps = [
    { key: 'manifest_created', label: 'Manifest Created', ts: shipment.created_at },
    { key: 'picked_up', label: 'Picked Up', ts: shipment.picked_up_at },
    { key: 'in_transit', label: 'In Transit', ts: shipment.in_transit_at },
    { key: 'out_for_delivery', label: 'Out for Delivery', ts: shipment.out_for_delivery_at },
    { key: 'delivered', label: 'Delivered', ts: shipment.delivered_at },
  ];

  const currentIdx = shipmentSteps.findIndex(s => s.key === shipment.current_status);

  return (
    <div className="mt-4 space-y-4">
      {/* Shipment Info Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">{shipment.courier_name || 'Courier'}</span>
        </div>
        {shipment.awb_number && (
          <Badge variant="outline" className="font-mono text-xs">{shipment.awb_number}</Badge>
        )}
        {shipment.current_location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Navigation className="w-3 h-3" />
            {shipment.current_location}
          </div>
        )}
        {shipment.estimated_delivery_date && (
          <Badge className="bg-accent/10 text-accent ml-auto">
            ETA: {format(new Date(shipment.estimated_delivery_date), 'MMM d')}
          </Badge>
        )}
      </div>

      {/* Shipment Progress Steps */}
      <div className="flex items-center gap-1">
        {shipmentSteps.map((step, idx) => {
          const isComplete = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isComplete ? 'bg-accent text-accent-foreground' :
                  isCurrent ? 'bg-accent/20 text-accent border-2 border-accent' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isComplete && idx < currentIdx ? <CheckCircle className="w-4 h-4" /> :
                   isCurrent ? <Radio className="w-4 h-4 animate-pulse" /> :
                   <span>{idx + 1}</span>}
                </div>
                <span className={`text-[10px] text-center leading-tight ${isComplete ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
              {idx < shipmentSteps.length - 1 && (
                <div className={`h-0.5 flex-1 mt-[-16px] ${idx < currentIdx ? 'bg-accent' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Live Tracking Events */}
      {events.length > 0 && (
        <div className="border rounded-lg p-4 space-y-0">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Milestone className="w-4 h-4 text-accent" />
            Live Tracking Updates
          </h4>
          <div className="space-y-0">
            {events.slice(0, 10).map((evt, idx) => (
              <div key={evt.id} className="flex gap-3 relative">
                {idx < Math.min(events.length - 1, 9) && (
                  <div className="absolute left-[7px] top-5 w-0.5 h-full bg-border" />
                )}
                <div className={`w-4 h-4 rounded-full shrink-0 mt-0.5 z-10 ${
                  idx === 0 ? 'bg-accent' : 'bg-muted border border-border'
                }`} />
                <div className="pb-4 flex-1">
                  <p className={`text-sm ${idx === 0 ? 'font-semibold' : 'font-medium'}`}>
                    {evt.event_description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {(evt.location_city || evt.location) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {evt.location_city || evt.location}
                        {evt.location_state && `, ${evt.location_state}`}
                      </span>
                    )}
                    <span>{format(new Date(evt.timestamp), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
        .select('*, order_items (*)')
        .eq('order_id', orderId);
      if (subOrdersError) throw subOrdersError;

      const vendorIds = [...new Set(subOrders.map(so => so.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name, logo_url')
        .in('id', vendorIds);
      const vendorMap = new Map(vendors?.map(v => [v.id, v]) || []);

      return {
        ...orderData,
        sub_orders: subOrders.map(so => ({ ...so, vendor: vendorMap.get(so.vendor_id) })),
      };
    },
    enabled: !!orderId,
  });

  const buildTimeline = (status: string, createdAt: string, shippedAt?: string, deliveredAt?: string) => {
    const currentIndex = statusOrder.indexOf(status);
    return statusOrder.map((s, index) => {
      const config = statusConfig[s];
      let timestamp: string | null = null;
      if (s === 'pending') timestamp = createdAt;
      else if (s === 'shipped' && shippedAt) timestamp = shippedAt;
      else if (s === 'delivered' && deliveredAt) timestamp = deliveredAt;
      else if (index <= currentIndex) timestamp = createdAt;
      return {
        status: s, label: config.label, description: config.description, icon: config.icon,
        timestamp, isCompleted: index < currentIndex, isCurrent: index === currentIndex,
      };
    });
  };

  const copyOrderNumber = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.order_number);
      haptic('success');
      toast.success('Order number copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const shareTracking = async () => {
    if (!order) return;
    const url = window.location.href;
    const text = `Tracking my order #${order.order_number}`;
    haptic('light');
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Tracking link copied');
      } catch {
        toast.error('Could not copy link');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
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
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" aria-hidden />
            <h1 className="text-2xl font-bold mb-2">Order not found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find the order you're looking for.</p>
            <Button asChild><Link to="/orders">View all orders</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button variant="ghost" asChild className="mb-3 -ml-3" onClick={() => haptic('light')}>
              <Link to="/orders" className="gap-2"><ArrowLeft className="w-4 h-4" aria-hidden /> Back to Orders</Link>
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">Track order</h1>
                <p className="text-muted-foreground text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    onClick={copyOrderNumber}
                    className="inline-flex items-center gap-1 font-mono text-foreground hover:text-accent transition-colors"
                    aria-label={`Copy order number ${order.order_number}`}
                  >
                    #{order.order_number}
                    <Copy className="w-3 h-3" aria-hidden />
                  </button>
                  <span aria-hidden>•</span>
                  <span>Placed {format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={shareTracking} className="gap-1.5" aria-label="Share tracking">
                  <Share2 className="w-4 h-4" aria-hidden /> Share
                </Button>
                <Badge variant="outline" className={
                  order.status === 'delivered' ? 'bg-success/10 text-success border-success/30' :
                  order.status === 'shipped' ? 'bg-info/10 text-info border-info/30' :
                  'bg-warning/10 text-warning border-warning/30'
                }>
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
              </div>
            </div>
          </motion.div>

          {order.sub_orders?.map((subOrder: any, index: number) => {
            const timeline = buildTimeline(subOrder.status, subOrder.created_at, subOrder.shipped_at, subOrder.delivered_at);
            return (
              <motion.div key={subOrder.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="mb-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {subOrder.vendor?.logo_url ? (
                          <img src={subOrder.vendor.logo_url} alt={subOrder.vendor.brand_name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-accent" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{subOrder.vendor?.brand_name || 'Vendor'}</CardTitle>
                          <p className="text-sm text-muted-foreground">Sub-order #{subOrder.sub_order_number}</p>
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
                  </CardHeader>
                  <CardContent>
                    {/* Order Status Timeline */}
                    <div className="relative">
                      {timeline.map((step, stepIndex) => {
                        const Icon = step.icon;
                        const isLast = stepIndex === timeline.length - 1;
                        return (
                          <div key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
                            {!isLast && (
                              <div className={`absolute left-5 top-10 w-0.5 h-full -translate-x-1/2 ${step.isCompleted ? 'bg-accent' : 'bg-border'}`} />
                            )}
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              step.isCompleted ? 'bg-accent text-accent-foreground' :
                              step.isCurrent ? 'bg-accent/20 text-accent border-2 border-accent' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 pt-1">
                              <p className={`font-medium ${step.isCompleted || step.isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              {step.timestamp && (step.isCompleted || step.isCurrent) && (
                                <p className="text-xs text-muted-foreground mt-1">{format(new Date(step.timestamp), 'MMM d, yyyy h:mm a')}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Real-time Shipment Tracking */}
                    {(subOrder.status === 'shipped' || subOrder.status === 'delivered') && (
                      <>
                        <Separator className="my-4" />
                        <ShipmentTimeline subOrderId={subOrder.id} />
                      </>
                    )}

                    {/* Items */}
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-medium mb-3">Items in this shipment</p>
                      <div className="space-y-2">
                        {subOrder.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_title} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product_title}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}</p>
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
      </main>
    </div>
  );
}
