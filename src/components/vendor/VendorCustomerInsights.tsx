import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Repeat, Crown, TrendingUp } from 'lucide-react';

type Row = {
  id: string;
  total_amount: number | null;
  created_at: string;
  orders: { id: string; customer_id: string | null; guest_email: string | null } | null;
};

export function VendorCustomerInsights() {
  const { data: vendorId } = useVendorId();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['vendor-customer-insights', vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async (): Promise<Row[]> => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();
      const { data, error } = await supabase
        .from('sub_orders')
        .select('id,total_amount,created_at,orders!inner(id,customer_id,guest_email)')
        .eq('vendor_id', vendorId!)
        .in('status', ['delivered', 'shipped', 'processing', 'confirmed'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const stats = useMemo(() => {
    if (!rows?.length) return null;
    const byCustomer = new Map<string, { key: string; label: string; orders: number; revenue: number; last: string; isGuest: boolean }>();
    for (const r of rows) {
      const o = r.orders;
      if (!o) continue;
      const key = o.customer_id ?? `guest:${o.guest_email ?? 'unknown'}`;
      const label = o.customer_id ? o.customer_id.slice(0, 8) : (o.guest_email ?? 'Guest');
      const existing = byCustomer.get(key) ?? { key, label, orders: 0, revenue: 0, last: r.created_at, isGuest: !o.customer_id };
      existing.orders += 1;
      existing.revenue += Number(r.total_amount ?? 0);
      if (r.created_at > existing.last) existing.last = r.created_at;
      byCustomer.set(key, existing);
    }
    const customers = Array.from(byCustomer.values());
    const totalCustomers = customers.length;
    const repeat = customers.filter((c) => c.orders > 1).length;
    const totalRevenue = customers.reduce((a, c) => a + c.revenue, 0);
    const avgLtv = totalCustomers ? totalRevenue / totalCustomers : 0;
    const top = [...customers].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    return { totalCustomers, repeat, repeatRate: totalCustomers ? (repeat / totalCustomers) * 100 : 0, avgLtv, top };
  }, [rows]);

  if (isLoading) return <Skeleton className="h-72 rounded-2xl" />;

  if (!stats) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-14 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No customer data yet</p>
          <p className="text-xs mt-1">Insights appear after your first fulfilled orders.</p>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: 'Unique buyers', value: stats.totalCustomers.toLocaleString(), icon: Users, color: 'text-info' },
    { label: 'Repeat buyers', value: stats.repeat.toLocaleString(), icon: Repeat, color: 'text-accent' },
    { label: 'Repeat rate', value: `${stats.repeatRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-success' },
    { label: 'Avg LTV (180d)', value: `₹${Math.round(stats.avgLtv).toLocaleString()}`, icon: Crown, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight">{k.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top customers (180 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.top.map((c, idx) => (
            <div key={c.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {c.isGuest ? c.label : `Customer #${c.label}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.orders} order{c.orders > 1 ? 's' : ''} · last {new Date(c.last).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">₹{Math.round(c.revenue).toLocaleString()}</p>
                {c.orders > 1 && <Badge variant="outline" className="text-[10px] mt-0.5">Repeat</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Customer identifiers are masked. Use Orders to view full details where permitted.
      </p>
    </div>
  );
}
