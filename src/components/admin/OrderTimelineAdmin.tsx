import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline } from './OrderTimeline';
import { Search, ShoppingCart, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export function OrderTimelineAdmin() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: recentOrders, isLoading } = useQuery({
    queryKey: ['admin-recent-orders-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const filteredOrders = recentOrders?.filter(o =>
    o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.includes(searchQuery)
  );

  if (selectedOrderId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedOrderId(null)} className="gap-2">
          ← Back to Orders
        </Button>
        <OrderTimeline orderId={selectedOrderId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Order Activity Feed</h2>
        <p className="text-muted-foreground">View detailed activity timelines for any order</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders?.map(order => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => setSelectedOrderId(order.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total_amount?.toLocaleString()}</p>
                    <Badge variant="outline" className="capitalize text-xs">{order.status}</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredOrders?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No orders found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
