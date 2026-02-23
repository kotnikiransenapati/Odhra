import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  Eye, ShoppingCart, CreditCard, CheckCircle, TrendingDown,
  ArrowDown, Target, Users, MousePointerClick, Search
} from 'lucide-react';

const FUNNEL_STEPS = [
  { key: 'page_view', label: 'Page Views', icon: Eye, color: 'hsl(var(--accent))' },
  { key: 'product_view', label: 'Product Views', icon: MousePointerClick, color: 'hsl(var(--info))' },
  { key: 'add_to_cart', label: 'Add to Cart', icon: ShoppingCart, color: 'hsl(var(--warning))' },
  { key: 'begin_checkout', label: 'Checkout Started', icon: CreditCard, color: 'hsl(var(--primary))' },
  { key: 'purchase', label: 'Purchase', icon: CheckCircle, color: 'hsl(var(--success))' },
];

const PIE_COLORS = ['hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export function FunnelAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const cutoff = subDays(new Date(), parseInt(dateRange)).toISOString();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['funnel-analytics', dateRange],
    queryFn: async () => {
      // Get event counts by type
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('event_type, created_at, properties, session_id')
        .gte('created_at', cutoff)
        .in('event_type', ['page_view', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase', 'search', 'wishlist_add', 'exit_intent']);

      if (error) throw error;

      // Count by event type
      const counts: Record<string, number> = {};
      const uniqueSessions: Record<string, Set<string>> = {};
      const dailyData: Record<string, Record<string, number>> = {};
      const searchQueries: Record<string, number> = {};
      const exitPages: Record<string, number> = {};

      (events || []).forEach(e => {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;

        if (!uniqueSessions[e.event_type]) uniqueSessions[e.event_type] = new Set();
        uniqueSessions[e.event_type].add(e.session_id);

        const day = format(new Date(e.created_at), 'MMM d');
        if (!dailyData[day]) dailyData[day] = {};
        dailyData[day][e.event_type] = (dailyData[day][e.event_type] || 0) + 1;

        if (e.event_type === 'search' && e.properties) {
          const q = (e.properties as any)?.query;
          if (q) searchQueries[q] = (searchQueries[q] || 0) + 1;
        }

        if (e.event_type === 'exit_intent' && e.properties) {
          const page = (e.properties as any)?.page_name || 'Unknown';
          exitPages[page] = (exitPages[page] || 0) + 1;
        }
      });

      // Build daily chart data
      const chartData = Object.entries(dailyData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([day, data]) => ({ day, ...data }));

      // Top searches
      const topSearches = Object.entries(searchQueries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      // Top exit pages
      const topExitPages = Object.entries(exitPages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));

      return {
        counts,
        uniqueSessions: Object.fromEntries(
          Object.entries(uniqueSessions).map(([k, v]) => [k, v.size])
        ),
        chartData,
        topSearches,
        topExitPages,
        totalEvents: events?.length || 0,
      };
    },
  });

  const counts = analyticsData?.counts || {};
  const sessions = analyticsData?.uniqueSessions || {};

  // Calculate funnel metrics
  const funnelData = FUNNEL_STEPS.map((step, idx) => {
    const count = counts[step.key] || 0;
    const prevCount = idx > 0 ? (counts[FUNNEL_STEPS[idx - 1].key] || 1) : count;
    const dropOff = idx > 0 ? Math.max(0, prevCount - count) : 0;
    const convRate = idx > 0 && prevCount > 0 ? (count / prevCount) * 100 : 100;
    return { ...step, count, dropOff, convRate, sessions: sessions[step.key] || 0 };
  });

  const overallConvRate = (counts.page_view || 0) > 0
    ? ((counts.purchase || 0) / (counts.page_view || 1)) * 100
    : 0;

  const cartAbandRate = (counts.add_to_cart || 0) > 0
    ? ((1 - (counts.purchase || 0) / (counts.add_to_cart || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Conversion Funnel</h2>
          <p className="text-muted-foreground text-sm">Browse → View → Cart → Checkout → Purchase analytics</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallConvRate.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">Overall Conversion</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cartAbandRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Cart Abandonment</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.page_view || 0}</p>
              <p className="text-xs text-muted-foreground">Unique Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.purchase || 0}</p>
              <p className="text-xs text-muted-foreground">Purchases</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {funnelData.map((step, idx) => {
            const Icon = step.icon;
            const maxCount = Math.max(...funnelData.map(s => s.count), 1);
            const widthPct = (step.count / maxCount) * 100;

            return (
              <div key={step.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: step.color }} />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{step.count.toLocaleString()}</span>
                    {idx > 0 && (
                      <Badge variant="outline" className={step.convRate >= 50 ? 'text-success' : step.convRate >= 20 ? 'text-warning' : 'text-destructive'}>
                        {step.convRate.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                    style={{ width: `${Math.max(widthPct, 2)}%`, backgroundColor: step.color }}
                  >
                    {widthPct > 15 && (
                      <span className="text-xs font-bold text-white">{step.count}</span>
                    )}
                  </div>
                </div>
                {idx > 0 && step.dropOff > 0 && (
                  <div className="flex items-center gap-1 text-xs text-destructive pl-6">
                    <ArrowDown className="w-3 h-3" />
                    <TrendingDown className="w-3 h-3" />
                    {step.dropOff.toLocaleString()} dropped ({(100 - step.convRate).toFixed(1)}% drop-off)
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Daily Trends Chart */}
      {analyticsData?.chartData && analyticsData.chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <RTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="page_view" name="Page Views" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="product_view" name="Product Views" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="add_to_cart" name="Add to Cart" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="purchase" name="Purchase" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Top Searches + Exit Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Top Search Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analyticsData?.topSearches || []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No search data yet</p>
            ) : (
              <div className="space-y-3">
                {analyticsData?.topSearches.map((s, idx) => (
                  <div key={s.query} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-sm font-medium">{s.query}</span>
                    </div>
                    <Badge variant="outline">{s.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Exit Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Top Exit Intent Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analyticsData?.topExitPages || []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No exit data yet</p>
            ) : (
              <div className="space-y-3">
                {analyticsData?.topExitPages.map((p, idx) => (
                  <div key={p.page} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-sm font-medium">{p.page}</span>
                    </div>
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive">{p.count} exits</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
