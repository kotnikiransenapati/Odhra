import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  ExternalLink,
  ShoppingBag,
  XCircle,
  PackageCheck,
  Timer,
  Box,
} from 'lucide-react';

const orderSteps = [
  { key: 'pending', label: 'Order Placed', icon: ShoppingBag },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Processing', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
];

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();

  const order = orders?.find((o) => o.id === orderId);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM dd, yyyy \'at\' h:mm a');
  };

  const getCurrentStepIndex = (status: string) => {
    if (status === 'cancelled' || status === 'refunded') return -1;
    return statusOrder.indexOf(status);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to view order details</p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <PageLoading text="Loading order details..." />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">This order doesn't exist or you don't have access.</p>
          <Button asChild>
            <Link to="/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
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
                <h1 className="text-display-sm md:text-display-md font-bold">
                  Order {order.order_number}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </motion.div>

          {/* Order Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="w-5 h-5 text-accent" />
                  Order Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCancelled ? (
                  <div className="flex items-center gap-4 p-6 bg-destructive/10 rounded-xl">
                    <XCircle className="w-10 h-10 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">
                        Order {order.status === 'cancelled' ? 'Cancelled' : 'Refunded'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This order was {order.status}. Contact support for more information.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full hidden md:block">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStepIndex / (orderSteps.length - 1)) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                      {orderSteps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                          <motion.div
                            key={step.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.1 }}
                            className={`flex flex-row md:flex-col items-center gap-3 md:text-center ${
                              isCompleted ? '' : 'opacity-50'
                            }`}
                          >
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isCurrent
                                  ? 'bg-accent text-accent-foreground ring-4 ring-accent/20'
                                  : isCompleted
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <step.icon className="w-7 h-7" />
                            </div>
                            <div className="md:mt-2">
                              <p className={`font-medium text-sm ${isCompleted ? '' : 'text-muted-foreground'}`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <Badge variant="outline" className="mt-1 text-xs bg-accent/10 border-accent/20">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Order Items & Sub-orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 space-y-4"
            >
              {order.sub_orders.map((subOrder, index) => (
                <Card key={subOrder.id} className="glass">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-accent" />
                        <div>
                          <p className="font-semibold">{subOrder.vendor_name || 'Vendor'}</p>
                          <p className="text-xs text-muted-foreground">{subOrder.sub_order_number}</p>
                        </div>
                      </div>
                      <OrderStatusBadge status={subOrder.status} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    {subOrder.items.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                          <img
                            src={item.product_image || '/placeholder.svg'}
                            alt={item.product_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.product_title}</p>
                          {item.variant_info && Object.keys(item.variant_info).length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {Object.entries(item.variant_info)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Qty: {item.quantity} × {formatPrice(item.unit_price)}
                          </p>
                          <p className="font-semibold mt-1">{formatPrice(item.total_price)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Tracking Info */}
                    {subOrder.tracking_number && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{subOrder.carrier || 'Shipping'}</p>
                              <p className="text-xs text-muted-foreground">
                                Tracking: {subOrder.tracking_number}
                              </p>
                            </div>
                          </div>
                          {subOrder.tracking_url && (
                            <Button variant="outline" size="sm" className="gap-1" asChild>
                              <a
                                href={subOrder.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Track <ExternalLink className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </>
                    )}

                    {/* Dates */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {subOrder.shipped_at && (
                        <span>Shipped: {format(new Date(subOrder.shipped_at), 'MMM dd, yyyy')}</span>
                      )}
                      {subOrder.delivered_at && (
                        <span>Delivered: {format(new Date(subOrder.delivered_at), 'MMM dd, yyyy')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Order Summary Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Payment Summary */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-accent" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.shipping_amount && order.shipping_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatPrice(order.shipping_amount)}</span>
                    </div>
                  )}
                  {order.tax_amount && order.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatPrice(order.tax_amount)}</span>
                    </div>
                  )}
                  {order.discount_amount && order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-accent">{formatPrice(order.total_amount)}</span>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    Payment Status: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">{order.shipping_address.full_name}</p>
                  <p className="text-muted-foreground">
                    {order.shipping_address.address_line1}
                    {order.shipping_address.address_line2 && (
                      <>, {order.shipping_address.address_line2}</>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shipping_address.city}, {order.shipping_address.state} -{' '}
                    {order.shipping_address.pincode}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{order.shipping_address.phone}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/contact">Need Help?</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
