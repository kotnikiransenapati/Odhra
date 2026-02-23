import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { VendorOrderFulfillment } from '@/components/vendor/VendorOrderFulfillment';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: 'bg-warning', icon: Clock, label: 'Pending' },
  confirmed: { color: 'bg-info', icon: CheckCircle, label: 'Confirmed' },
  processing: { color: 'bg-accent', icon: Package, label: 'Processing' },
  shipped: { color: 'bg-primary', icon: Truck, label: 'Shipped' },
  delivered: { color: 'bg-success', icon: CheckCircle, label: 'Delivered' },
  cancelled: { color: 'bg-destructive', icon: XCircle, label: 'Cancelled' },
};

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { data: vendorId, isLoading: vendorLoading } = useVendorId();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [fulfillOrder, setFulfillOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['vendor-orders', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('sub_orders')
        .select(`
          *,
          orders (
            order_number,
            shipping_address,
            customer_note
          ),
          order_items (
            id,
            product_title,
            product_image,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, tracking }: { orderId: string; status: string; tracking?: { number: string; carrier: string } }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'shipped' && tracking) {
        updateData.tracking_number = tracking.number;
        updateData.carrier = tracking.carrier;
        updateData.shipped_at = new Date().toISOString();
      }
      
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('sub_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Fetch order details for email notification
      const { data: subOrder } = await supabase
        .from('sub_orders')
        .select(`
          *,
          orders (
            order_number,
            customer_id,
            shipping_address
          )
        `)
        .eq('id', orderId)
        .single();

      if (subOrder?.orders?.customer_id) {
        // Get customer email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', subOrder.orders.customer_id)
          .single();

        if (profile?.email) {
          // Send email notification based on status
          let emailType: string | null = null;
          let emailData: Record<string, unknown> = {
            customerName: profile.full_name || 'there',
            orderNumber: subOrder.orders.order_number,
          };

          if (status === 'shipped' && tracking) {
            emailType = 'shipping_update';
            emailData = {
              ...emailData,
              trackingNumber: tracking.number,
              carrier: tracking.carrier,
              trackingUrl: `${window.location.origin}/account/orders`,  // OK: email links built server-side via send-email
            };
          } else if (status === 'delivered') {
            emailType = 'order_delivered';
            emailData = {
              ...emailData,
              deliveryDate: new Date().toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              }),
              reviewUrl: `${window.location.origin}/account/orders`,
            };
          }

          if (emailType) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  type: emailType,
                  to: profile.email,
                  data: emailData,
                },
              });
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
            }
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      const statusLabels: Record<string, string> = {
        shipped: 'Order shipped - customer notified',
        delivered: 'Order delivered - review request sent',
        confirmed: 'Order confirmed',
        processing: 'Order is now processing',
      };
      toast.success(statusLabels[variables.status] || 'Order updated successfully');
      setSelectedOrder(null);
      setTrackingNumber('');
      setCarrier('');
    },
    onError: () => {
      toast.error('Failed to update order');
    },
  });

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.sub_order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.orders?.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    if (newStatus === 'shipped') {
      setSelectedOrder(orderId);
    } else {
      updateOrderMutation.mutate({ orderId, status: newStatus });
    }
  };

  const handleShipOrder = () => {
    if (!selectedOrder || !trackingNumber || !carrier) {
      toast.error('Please fill in tracking details');
      return;
    }
    updateOrderMutation.mutate({
      orderId: selectedOrder,
      status: 'shipped',
      tracking: { number: trackingNumber, carrier },
    });
  };

  if (vendorLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-lg">Orders</h1>
            <p className="text-xs text-muted-foreground">Manage customer orders</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                  <p className="text-muted-foreground">
                    {search || statusFilter !== 'all' ? 'Try different filters' : 'Orders will appear here'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const config = statusConfig[order.status] || statusConfig.pending;
                      const StatusIcon = config.icon;

                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-mono font-medium text-sm">{order.sub_order_number}</p>
                              <p className="text-xs text-muted-foreground">{order.orders?.order_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {order.order_items?.slice(0, 3).map((item: { id: string; product_image: string }) => (
                                  <div key={item.id} className="w-8 h-8 rounded border-2 border-background bg-muted overflow-hidden">
                                    {item.product_image && (
                                      <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {order.order_items?.length || 0} item(s)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">₹{order.total_amount?.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                Earn: ₹{order.vendor_earnings?.toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${config.color} text-primary-foreground`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(order.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {order.status === 'processing' && (
                                <Button
                                  size="sm"
                                  onClick={() => setFulfillOrder(order)}
                                  disabled={updateOrderMutation.isPending}
                                >
                                  <Truck className="w-4 h-4 mr-1" />
                                  Fulfill
                                </Button>
                              )}
                              {order.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                                  disabled={updateOrderMutation.isPending}
                                >
                                  Confirm
                                </Button>
                              )}
                              {order.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(order.id, 'processing')}
                                  disabled={updateOrderMutation.isPending}
                                >
                                  Process
                                </Button>
                              )}
                              {order.status === 'shipped' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                  disabled={updateOrderMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Delivered
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Shipping Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shipping Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Tracking Number</label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Carrier</label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delhivery">Delhivery</SelectItem>
                  <SelectItem value="bluedart">BlueDart</SelectItem>
                  <SelectItem value="dtdc">DTDC</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="india_post">India Post</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleShipOrder} disabled={updateOrderMutation.isPending}>
              {updateOrderMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Truck className="w-4 h-4 mr-2" />
              )}
              Ship Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Dialog */}
      <VendorOrderFulfillment order={fulfillOrder} open={!!fulfillOrder} onOpenChange={() => setFulfillOrder(null)} />
    </div>
  );
}
