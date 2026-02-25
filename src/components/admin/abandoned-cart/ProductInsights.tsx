import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Package, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  dateRange: string;
  formatPrice: (n: number) => string;
}

export function AbandonedCartProductInsights({ dateRange, formatPrice }: Props) {
  // Get product-level stats from cart snapshots
  const { data: productStats = [], isLoading } = useQuery({
    queryKey: ['product-abandonment-stats', dateRange],
    queryFn: async () => {
      const { data: events } = await supabase
        .from('cart_abandonment_events')
        .select('cart_snapshot, recovered, cart_value, recovered_revenue')
        .gte('created_at', new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString());

      if (!events) return [];

      // Aggregate by product
      const productMap = new Map<string, {
        product_id: string; title: string; image_url: string;
        times_abandoned: number; times_recovered: number;
        lost_revenue: number; recovered_revenue: number;
      }>();

      for (const event of events) {
        const cart = event.cart_snapshot as any[];
        if (!Array.isArray(cart)) continue;

        for (const item of cart) {
          const existing = productMap.get(item.product_id) || {
            product_id: item.product_id,
            title: item.title || 'Unknown',
            image_url: item.image_url || '',
            times_abandoned: 0, times_recovered: 0,
            lost_revenue: 0, recovered_revenue: 0,
          };

          existing.times_abandoned++;
          const itemValue = (item.price || 0) * (item.quantity || 1);

          if (event.recovered) {
            existing.times_recovered++;
            existing.recovered_revenue += itemValue;
          } else {
            existing.lost_revenue += itemValue;
          }

          productMap.set(item.product_id, existing);
        }
      }

      return Array.from(productMap.values())
        .sort((a, b) => b.times_abandoned - a.times_abandoned)
        .slice(0, 30);
    },
  });

  const maxAbandoned = Math.max(...productStats.map(p => p.times_abandoned), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg gap-2 flex items-center"><Package className="w-5 h-5" />Most Abandoned Products</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : productStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No product-level data yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Abandoned</TableHead>
                <TableHead>Recovered</TableHead>
                <TableHead>Recovery Rate</TableHead>
                <TableHead>Lost Revenue</TableHead>
                <TableHead>Recovered Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productStats.map((product) => {
                const rate = product.times_abandoned > 0 ? (product.times_recovered / product.times_abandoned) * 100 : 0;
                return (
                  <TableRow key={product.product_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-sm font-medium line-clamp-1 max-w-[200px]">{product.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-bold">{product.times_abandoned}</span>
                        <Progress value={(product.times_abandoned / maxAbandoned) * 100} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.times_recovered}</TableCell>
                    <TableCell>
                      <Badge variant={rate >= 30 ? 'default' : rate >= 15 ? 'secondary' : 'outline'}
                        className="gap-1">
                        {rate >= 30 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-destructive font-medium">{formatPrice(product.lost_revenue)}</TableCell>
                    <TableCell className="text-green-600 font-medium">{formatPrice(product.recovered_revenue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
