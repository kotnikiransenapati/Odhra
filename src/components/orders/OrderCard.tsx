import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from './OrderStatusBadge';
import { QuickReorderButton } from './QuickReorderButton';
import { Order } from '@/hooks/useOrders';
import {
  ChevronRight,
  MapPin,
  Package,
  ExternalLink,
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  index: number;
}

export function OrderCard({ order, index }: OrderCardProps) {
  const navigate = useNavigate();
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Get all items across sub-orders
  const allItems = order.sub_orders.flatMap((so) => so.items);
  const displayItems = allItems.slice(0, 3);
  const remainingCount = allItems.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold">{order.order_number}</h3>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-accent">
                {formatPrice(order.total_amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {allItems.length} item{allItems.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Order Items Preview */}
          <div className="space-y-3">
            {displayItems.map((item) => (
              <Link 
                key={item.id} 
                to={item.product_slug ? `/product/${item.product_slug}` : '#'}
                className="flex gap-3 group hover:bg-secondary/30 -mx-2 px-2 py-1 rounded-lg transition-colors"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 group-hover:ring-2 ring-accent/50 transition-all">
                  <img
                    src={item.product_image || '/placeholder.svg'}
                    alt={item.product_title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{item.product_title}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                </div>
              </Link>
            ))}
            {remainingCount > 0 && (
              <p className="text-sm text-muted-foreground">
                + {remainingCount} more item{remainingCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <Separator />

          {/* Sub-orders with tracking */}
          <div className="space-y-3">
            {order.sub_orders.map((subOrder) => (
              <div
                key={subOrder.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {subOrder.vendor_name || 'Vendor'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <OrderStatusBadge status={subOrder.status} size="sm" />
                      {subOrder.tracking_number && (
                        <span className="text-xs text-muted-foreground">
                          #{subOrder.tracking_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {subOrder.tracking_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    asChild
                  >
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
            ))}
          </div>

          {/* Shipping Address */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {order.shipping_address.full_name}, {order.shipping_address.address_line1},{' '}
              {order.shipping_address.city}, {order.shipping_address.state} -{' '}
              {order.shipping_address.pincode}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {order.status === 'delivered' && (
              <QuickReorderButton items={allItems} variant="compact" />
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link to={`/orders/${order.id}`}>
                View Details <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
