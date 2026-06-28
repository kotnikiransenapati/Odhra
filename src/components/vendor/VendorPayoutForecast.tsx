import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Wallet, TrendingUp, Hourglass } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';

type SubOrderRow = {
  id: string;
  status: string;
  vendor_earnings: number | null;
  total_amount: number | null;
  delivered_at: string | null;
  shipped_at: string | null;
  created_at: string;
  return_window_ends_at: string | null;
};

const HOLD_DAYS = 7;

export function VendorPayoutForecast() {
  const { data: vendorId } = useVendorId();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-payout-forecast', vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
      const { data: subs, error } = await supabase
        .from('sub_orders')
        .select('id,status,vendor_earnings,total_amount,delivered_at,shipped_at,created_at,return_window_ends_at')
        .eq('vendor_id', vendorId!)
        .in('status', ['processing', 'confirmed', 'shipped', 'delivered'])
        .gte('created_at', since)
        .limit(1000);
      if (error) throw error;
      const { data: pending } = await supabase
        .from('payout_requests')
        .select('amount,status,created_at')
        .eq('vendor_id', vendorId!)
        .in('status', ['pending', 'processing']);
      return { subs: (subs ?? []) as SubOrderRow[], pending: pending ?? [] };
    },
  });

  const forecast = useMemo(() => {
    if (!data) return null;
    const buckets = new Map<string, number>();
    let totalEligible = 0;
    let inHold = 0;
    const today = startOfDay(new Date());

    for (const s of data.subs) {
      const earnings = Number(s.vendor_earnings ?? s.total_amount ?? 0);
      if (!earnings) continue;
      let releaseDate: Date | null = null;
      if (s.status === 'delivered' && s.delivered_at) {
        releaseDate = addDays(new Date(s.delivered_at), HOLD_DAYS);
      } else if (s.shipped_at) {
        releaseDate = addDays(new Date(s.shipped_at), HOLD_DAYS + 5);
      } else {
        releaseDate = addDays(new Date(s.created_at), HOLD_DAYS + 10);
      }
      const key = format(startOfDay(releaseDate), 'yyyy-MM-dd');
      buckets.set(key, (buckets.get(key) ?? 0) + earnings);
      if (releaseDate <= today) totalEligible += earnings;
      else inHold += earnings;
    }

    const upcoming = Array.from(buckets.entries())
      .map(([d, v]) => ({ date: new Date(d), amount: v }))
      .filter((b) => b.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);

    const next7 = upcoming.filter((b) => b.date <= addDays(today, 7)).reduce((a, c) => a + c.amount, 0);
    const next30 = upcoming.filter((b) => b.date <= addDays(today, 30)).reduce((a, c) => a + c.amount, 0);
    const pendingPayouts = data.pending.reduce((a, p: any) => a + Number(p.amount ?? 0), 0);

    return { totalEligible, inHold, next7, next30, upcoming, pendingPayouts };
  }, [data]);

  if (isLoading) return <Skeleton className="h-72 rounded-2xl" />;
  if (!forecast) return null;

  const max = Math.max(1, ...forecast.upcoming.map((u) => u.amount));

  const kpis = [
    { label: 'Releasable now', value: `₹${Math.round(forecast.totalEligible).toLocaleString()}`, icon: Wallet, color: 'text-success' },
    { label: 'In hold window', value: `₹${Math.round(forecast.inHold).toLocaleString()}`, icon: Hourglass, color: 'text-warning' },
    { label: 'Releasing next 7d', value: `₹${Math.round(forecast.next7).toLocaleString()}`, icon: CalendarClock, color: 'text-info' },
    { label: 'Releasing next 30d', value: `₹${Math.round(forecast.next30).toLocaleString()}`, icon: TrendingUp, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/40">
            <CardContent className="p-4">
              <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
              <p className="text-2xl font-bold tracking-tight">{k.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming releases</CardTitle>
            {forecast.pendingPayouts > 0 && (
              <Badge variant="outline">₹{Math.round(forecast.pendingPayouts).toLocaleString()} payout requested</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {forecast.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No scheduled releases in the forecast window.</p>
          ) : (
            <div className="space-y-2">
              {forecast.upcoming.map((b) => (
                <div key={b.date.toISOString()} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground shrink-0">{format(b.date, 'MMM d')}</div>
                  <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent to-accent/60 rounded-full" style={{ width: `${(b.amount / max) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right text-sm font-semibold tabular-nums">₹{Math.round(b.amount).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-4">
            Estimates only. Final release depends on platform holds, returns, and payout cycle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
