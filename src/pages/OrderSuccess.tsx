import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import {
  CheckCircle,
  Package,
  MapPin,
  Receipt,
  ArrowRight,
  Download,
  Share2,
  Truck,
  ShoppingBag,
  Clock,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderSuccess() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order_number');
  const { user } = useAuth();
  const [confettiShown, setConfettiShown] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-success', orderId],
    queryFn: async () => {
      if (!orderId || !user) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          sub_orders (
            *,
            order_items (
              *,
              products (title, slug)
            ),
            vendors:vendor_id (brand_name)
          )
        `)
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Show confetti effect once
  useEffect(() => {
    if (order && !confettiShown) {
      setConfettiShown(true);
    }
  }, [order, confettiShown]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShareOrder = async () => {
    const shareUrl = window.location.href;
    const shareText = `I just placed an order on Odhra! Order #${order?.order_number}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Odhra Order',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Order link copied to clipboard!');
    }
  };

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
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find this order or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/orders">View My Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const shippingAddress = order.shipping_address as {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
  };

  const totalItems = order.sub_orders?.reduce(
    (sum: number, sub: any) => sum + (sub.order_items?.length || 0),
    0
  ) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-14 h-14 text-green-500" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Order Placed Successfully! 🎉
              </h1>
              <p className="text-muted-foreground">
                Thank you for your purchase. We've sent a confirmation email to your registered email.
              </p>
            </motion.div>
          </motion.div>

          {/* Order Number Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6 bg-accent/5 border-accent/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <p className="text-2xl font-bold text-accent mb-4">
                  {order.order_number}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(order.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
          >
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to={`/orders/${order.id}`}>
                <Truck className="w-5 h-5" />
                <span className="text-xs">Track Order</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/orders">
                <Package className="w-5 h-5" />
                <span className="text-xs">My Orders</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={handleShareOrder}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-xs">Share</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/shop">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs">Shop More</span>
              </Link>
            </Button>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.sub_orders?.map((subOrder: any) => (
                    <div key={subOrder.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {subOrder.vendors?.brand_name || 'Vendor'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          #{subOrder.sub_order_number}
                        </span>
                      </div>
                      {subOrder.order_items?.map((item: any) => (
                        <div key={item.id} className="flex gap-3 py-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                            <img
                              src={item.product_image || '/placeholder.svg'}
                              alt={item.product_title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.product_title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × {formatPrice(item.unit_price)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatPrice(item.total_price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Order Summary & Shipping */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{shippingAddress.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {shippingAddress.address_line1}
                      {shippingAddress.address_line2 && `, ${shippingAddress.address_line2}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      📞 {shippingAddress.phone}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Payment Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount_amount && order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{order.shipping_amount ? formatPrice(order.shipping_amount) : 'Free'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (GST)</span>
                      <span>{formatPrice(order.tax_amount || 0)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total Paid</span>
                      <span className="text-accent">{formatPrice(order.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="secondary" className="text-xs">
                        {order.payment_method?.toUpperCase() || 'ONLINE'}
                      </Badge>
                      <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        Paid
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Email Notification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Confirmation Email Sent</p>
                  <p className="text-xs text-muted-foreground">
                    We've sent order details and tracking information to your email
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Continue Shopping CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-8 text-center"
          >
            <Button size="lg" asChild>
              <Link to="/shop" className="gap-2">
                Continue Shopping <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
