import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, subMonths, differenceInCalendarMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Repeat, TrendingUp } from 'lucide-react';

interface OrderRow {
  customer_id: string | null;
  created_at: string;
}

const COHORT_MONTHS = 6; // last 6 months as cohorts
const MAX_PERIODS = 6; // 0..5 months out

export function CohortRetentionDashboard() {
  const sinceDate = useMemo(() => subMonths(startOfMonth(new Date()), COHORT_MONTHS - 1), []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['cohort-orders', sinceDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id, created_at')
        .gte('created_at', sinceDate.toISOString())
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const { cohorts, summary } = useMemo(() => {
    // First-order month per customer
    const firstOrder = new Map<string, Date>();
    orders.forEach((o) => {
      if (!o.customer_id) return;
      const d = new Date(o.created_at);
      const existing = firstOrder.get(o.customer_id);
      if (!existing || d < existing) firstOrder.set(o.customer_id, d);
    });

    // cohort key (YYYY-MM) -> { size, retention[period] = Set<customer> }
    const cohortMap = new Map<
      string,
      { label: string; start: Date; size: number; activity: Set<string>[] }
    >();
    for (let i = COHORT_MONTHS - 1; i >= 0; i--) {
      const start = subMonths(startOfMonth(new Date()), i);
      const key = format(start, 'yyyy-MM');
      cohortMap.set(key, {
        label: format(start, 'MMM yy'),
        start,
        size: 0,
        activity: Array.from({ length: MAX_PERIODS }, () => new Set<string>()),
      });
    }

    firstOrder.forEach((firstDate, customerId) => {
      const key = format(startOfMonth(firstDate), 'yyyy-MM');
      const cohort = cohortMap.get(key);
      if (cohort) cohort.size += 1;
    });

    // Fill activity buckets
    orders.forEach((o) => {
      if (!o.customer_id) return;
      const fd = firstOrder.get(o.customer_id);
      if (!fd) return;
      const cohortKey = format(startOfMonth(fd), 'yyyy-MM');
      const cohort = cohortMap.get(cohortKey);
      if (!cohort) return;
      const period = differenceInCalendarMonths(new Date(o.created_at), cohort.start);
      if (period >= 0 && period < MAX_PERIODS) {
        cohort.activity[period].add(o.customer_id);
      }
    });

    const cohortsArr = Array.from(cohortMap.values());

    // Overall repeat rate (% of customers with >1 order in window)
    let repeat = 0;
    const orderCount = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.customer_id) return;
      orderCount.set(o.customer_id, (orderCount.get(o.customer_id) || 0) + 1);
    });
    orderCount.forEach((c) => {
      if (c > 1) repeat += 1;
    });
    const totalCustomers = firstOrder.size;
    const repeatRate = totalCustomers ? (repeat / totalCustomers) * 100 : 0;

    // M1 retention avg (cohorts with >=1 month of maturity)
    const mature = cohortsArr.slice(0, -1);
    const m1Sum = mature.reduce(
      (s, c) => s + (c.size ? c.activity[1].size / c.size : 0),
      0
    );
    const m1Avg = mature.length ? (m1Sum / mature.length) * 100 : 0;

    return {
      cohorts: cohortsArr,
      summary: { totalCustomers, repeat, repeatRate, m1Avg },
    };
  }, [orders]);

  const heatColor = (pct: number) => {
    if (pct === 0) return 'bg-secondary/30 text-muted-foreground';
    if (pct < 10) return 'bg-accent/10 text-foreground';
    if (pct < 25) return 'bg-accent/25 text-foreground';
    if (pct < 50) return 'bg-accent/50 text-accent-foreground';
    if (pct < 75) return 'bg-accent/75 text-accent-foreground';
    return 'bg-accent text-accent-foreground';
  };

  const now = startOfMonth(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Repeat className="w-6 h-6 text-accent" />
          Cohort Retention
        </h2>
        <p className="text-sm text-muted-foreground">
          How well each monthly cohort comes back to purchase
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" /> New customers ({COHORT_MONTHS}mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Repeat className="w-4 h-4 text-success" /> Repeat rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {summary.repeatRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.repeat} of {summary.totalCustomers} purchased again
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-warning" /> Avg M1 retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{summary.m1Avg.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Returned in next month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Retention heatmap (% of cohort active)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left p-2 font-medium">Cohort</th>
                    <th className="text-right p-2 font-medium">Size</th>
                    {Array.from({ length: MAX_PERIODS }, (_, i) => (
                      <th key={i} className="text-center p-2 font-medium">
                        M{i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => {
                    const monthsOld = differenceInCalendarMonths(now, c.start);
                    return (
                      <tr key={c.label} className="border-t border-border/50">
                        <td className="p-2 font-medium">{c.label}</td>
                        <td className="p-2 text-right font-mono">{c.size}</td>
                        {c.activity.map((set, i) => {
                          const visible = i <= monthsOld;
                          if (!visible) {
                            return (
                              <td key={i} className="p-1">
                                <div className="rounded h-9 bg-transparent" />
                              </td>
                            );
                          }
                          const pct = c.size ? (set.size / c.size) * 100 : 0;
                          return (
                            <td key={i} className="p-1">
                              <div
                                className={`rounded h-9 flex flex-col items-center justify-center font-semibold ${heatColor(pct)}`}
                                title={`${set.size} of ${c.size} customers`}
                              >
                                <span>{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            M0 is the acquisition month (always 100% by definition of the cohort). Cells fill in
            as cohorts mature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
