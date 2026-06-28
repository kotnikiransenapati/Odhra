import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, ShoppingBag, Star, Award } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

type Goal = {
  id: string;
  period_month: string;
  target_revenue: number | null;
  target_orders: number | null;
  target_rating: number | null;
  bonus_amount: number | null;
  notes: string | null;
  is_active: boolean | null;
};

export function VendorPerformanceGoals() {
  const { data: vendorId } = useVendorId();
  const [month] = useState(() => startOfMonth(new Date()));
  const monthKey = format(month, 'yyyy-MM-01');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-performance-goals', vendorId, monthKey],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = startOfMonth(month).toISOString();
      const monthEnd = endOfMonth(month).toISOString();
      const [{ data: goals }, { data: subs }, { data: ratingAgg }] = await Promise.all([
        supabase
          .from('vendor_sales_goals')
          .select('*')
          .eq('vendor_id', vendorId!)
          .eq('is_active', true)
          .lte('period_month', monthKey)
          .order('period_month', { ascending: false })
          .limit(1),
        supabase
          .from('sub_orders')
          .select('total_amount,status,created_at')
          .eq('vendor_id', vendorId!)
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd)
          .in('status', ['confirmed', 'processing', 'shipped', 'delivered']),
        supabase
          .from('reviews')
          .select('rating, products!inner(vendor_id)')
          .eq('products.vendor_id', vendorId!)
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd),
      ]);

      const revenue = (subs ?? []).reduce((a: number, s: any) => a + Number(s.total_amount ?? 0), 0);
      const orders = (subs ?? []).length;
      const ratings = (ratingAgg ?? []) as any[];
      const avgRating = ratings.length ? ratings.reduce((a, r) => a + (r.rating ?? 0), 0) / ratings.length : 0;
      return { goal: ((goals ?? [])[0] ?? null) as Goal | null, revenue, orders, avgRating, ratingCount: ratings.length };
    },
  });

  const metrics = useMemo(() => {
    if (!data) return null;
    const g = data.goal;
    const items = [
      {
        key: 'revenue', icon: Target, label: 'Revenue', color: 'text-success',
        current: data.revenue, target: Number(g?.target_revenue ?? 0),
        fmt: (n: number) => `₹${Math.round(n).toLocaleString()}`,
      },
      {
        key: 'orders', icon: ShoppingBag, label: 'Orders', color: 'text-info',
        current: data.orders, target: Number(g?.target_orders ?? 0),
        fmt: (n: number) => n.toLocaleString(),
      },
      {
        key: 'rating', icon: Star, label: 'Avg rating', color: 'text-accent',
        current: data.avgRating, target: Number(g?.target_rating ?? 0),
        fmt: (n: number) => n.toFixed(2),
      },
    ];
    return items.map((m) => ({
      ...m,
      pct: m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : null,
    }));
  }, [data]);

  if (isLoading) return <Skeleton className="h-72 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Goals for {format(month, 'MMMM yyyy')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.goal ? 'Targets set by platform performance team.' : 'No active goal set for this period.'}
              </p>
            </div>
            {data?.goal?.bonus_amount ? (
              <Badge className="gap-1 bg-success/15 text-success border-success/30" variant="outline">
                <Award className="w-3 h-3" /> Bonus ₹{Math.round(Number(data.goal.bonus_amount)).toLocaleString()}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {metrics?.map((m) => (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <span className="text-sm tabular-nums">
                  <span className="font-bold">{m.fmt(m.current)}</span>
                  {m.target > 0 && <span className="text-muted-foreground"> / {m.fmt(m.target)}</span>}
                </span>
              </div>
              {m.pct !== null ? (
                <div className="flex items-center gap-3">
                  <Progress value={m.pct} className="h-2 flex-1" />
                  <span className={`text-xs font-semibold w-10 text-right ${m.pct >= 100 ? 'text-success' : m.pct >= 60 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {m.pct}%
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No target configured</p>
              )}
            </div>
          ))}
          {data?.goal?.notes && (
            <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
              <strong className="text-foreground">Note from platform:</strong> {data.goal.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
