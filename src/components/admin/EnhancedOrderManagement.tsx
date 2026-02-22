import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { useAdminOrders, useUpdateOrder } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ShoppingCart,
  Search,
  Loader2,
  Eye,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export function EnhancedOrderManagement() {
  const { data: orders, isLoading } = useAdminOrders();
  const updateOrder = useUpdateOrder();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  // Fetch order details when order is selected
  const { data: orderDetails } = useQuery({
    queryKey: ['order-details', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;

      // Get sub-orders
      const { data: subOrders } = await supabase
        .from('sub_orders')
        .select('*')
        .eq('order_id', selectedOrder.id);

      // Get order items for each sub-order
      const subOrdersWithItems = await Promise.all(
        (subOrders || []).map(async (so) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('sub_order_id', so.id);

          const { data: vendor } = await supabase
            .from('vendors')
            .select('brand_name')
            .eq('id', so.vendor_id)
            .single();

          return { ...so, items, vendor_name: vendor?.brand_name };
        })
      );

      return { ...selectedOrder, sub_orders: subOrdersWithItems };
    },
    enabled: !!selectedOrder?.id,
  });

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && order.status === statusFilter;
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusChange = (orderId: string, newStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded') => {
    updateOrder.mutate({ 
      orderId, 
      updates: { status: newStatus },
      trackingInfo: newStatus === 'shipped' ? { trackingNumber, carrier } : undefined
    });
  };

  // Calculate stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    processing: orders?.filter(o => ['confirmed', 'processing'].includes(o.status)).length || 0,
    shipped: orders?.filter(o => o.status === 'shipped').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
    totalRevenue: orders?.filter(o => ['paid', 'escrow'].includes(o.payment_status)).reduce((sum, o) => sum + o.total_amount, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, icon: ShoppingCart, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Processing', value: stats.processing, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Shipped', value: stats.shipped, icon: Truck, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or email..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Orders ({filteredOrders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border hover:bg-secondary/20 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium font-mono text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) => {
                          handleStatusChange(order.id, value as any);
                        }}
                        disabled={updateOrder.isPending}
                      >
                        <SelectTrigger className="w-[130px] h-8" onClick={(e) => e.stopPropagation()}>
                          <OrderStatusBadge status={order.status} size="sm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.payment_status === 'paid' ? 'default' :
                          order.payment_status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Order {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-150px)]">
            {orderDetails && (
              <div className="space-y-6 pr-4">
                {/* Order Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <OrderStatusBadge status={orderDetails.status} />
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <Badge variant={orderDetails.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {orderDetails.payment_status}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-lg">{formatPrice(orderDetails.total_amount)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(orderDetails.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{orderDetails.customer_email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{orderDetails.customer_name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    {orderDetails.shipping_address && (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{(orderDetails.shipping_address as any).name}</p>
                        <p>{(orderDetails.shipping_address as any).address}</p>
                        <p>
                          {(orderDetails.shipping_address as any).city}, {(orderDetails.shipping_address as any).state} {(orderDetails.shipping_address as any).pincode}
                        </p>
                        {(orderDetails.shipping_address as any).phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {(orderDetails.shipping_address as any).phone}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sub-orders and Items */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order Items
                  </h4>
                  {orderDetails.sub_orders?.map((subOrder: any) => (
                    <Card key={subOrder.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {subOrder.vendor_name} - {subOrder.sub_order_number}
                          </CardTitle>
                          <OrderStatusBadge status={subOrder.status} size="sm" />
                        </div>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="space-y-3">
                          {subOrder.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-4">
                              {item.product_image && (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_title}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.product_title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} × {formatPrice(item.unit_price)}
                                </p>
                              </div>
                              <p className="font-medium">{formatPrice(item.total_price)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between">
                          <span className="text-sm text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatPrice(subOrder.subtotal)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Order Totals */}
                <Card>
                  <CardContent className="py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(orderDetails.subtotal)}</span>
                      </div>
                      {orderDetails.shipping_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping</span>
                          <span>{formatPrice(orderDetails.shipping_amount)}</span>
                        </div>
                      )}
                      {orderDetails.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-success">
                          <span>Discount</span>
                          <span>-{formatPrice(orderDetails.discount_amount)}</span>
                        </div>
                      )}
                      {orderDetails.tax_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span>{formatPrice(orderDetails.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span>{formatPrice(orderDetails.total_amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
