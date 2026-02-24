import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  Eye, MousePointerClick, ShoppingCart, Search, Heart, TrendingUp,
  Monitor, Smartphone, Tablet, Globe, ArrowUpRight, Users, Activity,
  Target, Zap, RefreshCw,
} from 'lucide-react';

const COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--primary))',
  'hsl(var(--warning, 38 92% 50%))',
  'hsl(var(--info, 217 91% 60%))',
  'hsl(var(--success, 142 71% 45%))',
  'hsl(var(--destructive))',
];

type Period = '24h' | '7d' | '30d' | '90d';

function useBehaviorStats(period: Period) {
  const interval = { '24h': '1 day', '7d': '7 days', '30d': '30 days', '90d': '90 days' }[period];

  return useQuery({
    queryKey: ['behavior-stats', period],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(interval));

      // Event counts by type
      const { data: eventCounts } = await supabase
        .from('user_behavior_events')
        .select('event_type')
        .gte('created_at', since.toISOString());

      // Device breakdown
      const { data: deviceData } = await supabase
        .from('user_behavior_events')
        .select('device_type')
        .gte('created_at', since.toISOString())
        .not('device_type', 'is', null);

      // UTM sources
      const { data: utmData } = await supabase
        .from('user_behavior_events')
        .select('utm_source, utm_medium, utm_campaign')
        .gte('created_at', since.toISOString())
        .not('utm_source', 'is', null);

      // Top pages
      const { data: pageData } = await supabase
        .from('user_behavior_events')
        .select('page_url')
        .eq('event_type', 'page_view')
        .gte('created_at', since.toISOString())
        .not('page_url', 'is', null);

      // Top viewed products
      const { data: productViews } = await supabase
        .from('user_behavior_events')
        .select('product_id, metadata')
        .eq('event_type', 'product_view')
        .gte('created_at', since.toISOString())
        .not('product_id', 'is', null)
        .limit(500);

      // Scroll depth distribution
      const { data: scrollData } = await supabase
        .from('user_behavior_events')
        .select('scroll_depth')
        .eq('event_type', 'scroll_milestone')
        .gte('created_at', since.toISOString())
        .not('scroll_depth', 'is', null);

      // Unique sessions & users
      const { data: sessionData } = await supabase
        .from('user_behavior_events')
        .select('session_id, user_id')
        .gte('created_at', since.toISOString());

      // Daily trend
      const { data: dailyData } = await supabase
        .from('user_behavior_events')
        .select('created_at, event_type')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      // Aggregate event counts
      const counts: Record<string, number> = {};
      (eventCounts || []).forEach(e => {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      });

      // Device breakdown
      const devices: Record<string, number> = {};
      (deviceData || []).forEach(e => {
        if (e.device_type) devices[e.device_type] = (devices[e.device_type] || 0) + 1;
      });

      // UTM breakdown
      const utmSources: Record<string, number> = {};
      (utmData || []).forEach(e => {
        if (e.utm_source) utmSources[e.utm_source] = (utmSources[e.utm_source] || 0) + 1;
      });

      // Page views count
      const pages: Record<string, number> = {};
      (pageData || []).forEach(e => {
        if (e.page_url) pages[e.page_url] = (pages[e.page_url] || 0) + 1;
      });

      // Product view counts
      const products: Record<string, number> = {};
      (productViews || []).forEach(e => {
        if (e.product_id) products[e.product_id] = (products[e.product_id] || 0) + 1;
      });

      // Scroll depth
      const scrollDist: Record<number, number> = {};
      (scrollData || []).forEach(e => {
        if (e.scroll_depth) scrollDist[e.scroll_depth] = (scrollDist[e.scroll_depth] || 0) + 1;
      });

      // Unique counts
      const uniqueSessions = new Set((sessionData || []).map(e => e.session_id)).size;
      const uniqueUsers = new Set((sessionData || []).filter(e => e.user_id).map(e => e.user_id)).size;

      // Daily trend
      const dailyMap: Record<string, Record<string, number>> = {};
      (dailyData || []).forEach(e => {
        const day = e.created_at.split('T')[0];
        if (!dailyMap[day]) dailyMap[day] = {};
        dailyMap[day][e.event_type] = (dailyMap[day][e.event_type] || 0) + 1;
      });

      const dailyTrend = Object.entries(dailyMap)
        .map(([date, types]) => ({
          date: date.slice(5), // MM-DD
          page_views: types['page_view'] || 0,
          product_views: types['product_view'] || 0,
          add_to_cart: types['add_to_cart'] || 0,
          purchases: types['purchase'] || 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        counts,
        devices: Object.entries(devices).map(([name, value]) => ({ name, value })),
        utmSources: Object.entries(utmSources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        topPages: Object.entries(pages).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        topProducts: Object.entries(products).map(([id, value]) => ({ id, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        scrollDist: [25, 50, 75, 90, 100].map(d => ({ depth: `${d}%`, count: scrollDist[d] || 0 })),
        uniqueSessions,
        uniqueUsers,
        totalEvents: eventCounts?.length || 0,
        dailyTrend,
      };
    },
    staleTime: 60000,
  });
}

function useTopBehaviorProfiles() {
  return useQuery({
    queryKey: ['top-behavior-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_behavior_profiles')
        .select('*')
        .order('engagement_score', { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 120000,
  });
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function BehaviorAnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('7d');
  const { data: stats, isLoading, refetch } = useBehaviorStats(period);
  const { data: profiles } = useTopBehaviorProfiles();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const eventTypeData = stats ? [
    { name: 'Page Views', value: stats.counts['page_view'] || 0, icon: Eye },
    { name: 'Product Views', value: stats.counts['product_view'] || 0, icon: MousePointerClick },
    { name: 'Add to Cart', value: stats.counts['add_to_cart'] || 0, icon: ShoppingCart },
    { name: 'Purchases', value: stats.counts['purchase'] || 0, icon: TrendingUp },
    { name: 'Searches', value: stats.counts['search'] || 0, icon: Search },
    { name: 'Wishlist', value: stats.counts['wishlist_add'] || 0, icon: Heart },
    { name: 'Exit Intent', value: stats.counts['exit_intent'] || 0, icon: ArrowUpRight },
    { name: 'Scroll Milestones', value: stats.counts['scroll_milestone'] || 0, icon: Activity },
  ] : [];

  const conversionRate = stats && (stats.counts['page_view'] || 0) > 0
    ? (((stats.counts['purchase'] || 0) / (stats.counts['page_view'] || 1)) * 100).toFixed(2)
    : '0.00';

  const cartRate = stats && (stats.counts['product_view'] || 0) > 0
    ? (((stats.counts['add_to_cart'] || 0) / (stats.counts['product_view'] || 1)) * 100).toFixed(1)
    : '0.0';

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (type === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            Behavior Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track user behavior, engagement patterns, and conversion signals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Events" value={stats?.totalEvents || 0} color="bg-accent/10 text-accent" />
        <StatCard icon={Users} label="Unique Sessions" value={stats?.uniqueSessions || 0} sub={`${stats?.uniqueUsers || 0} logged-in users`} color="bg-primary/10 text-primary" />
        <StatCard icon={Target} label="Conversion Rate" value={`${conversionRate}%`} sub="Page view → Purchase" color="bg-success/10 text-success" />
        <StatCard icon={Zap} label="Cart Rate" value={`${cartRate}%`} sub="Product view → Add to cart" color="bg-warning/10 text-warning" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="profiles">User Profiles</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Event Trend</CardTitle>
              <CardDescription>Key behavior metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="page_views" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} name="Page Views" />
                    <Area type="monotone" dataKey="product_views" stackId="2" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} name="Product Views" />
                    <Area type="monotone" dataKey="add_to_cart" stackId="3" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} name="Add to Cart" />
                    <Area type="monotone" dataKey="purchases" stackId="4" stroke={COLORS[4]} fill={COLORS[4]} fillOpacity={0.3} name="Purchases" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Event Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {eventTypeData.map(e => (
              <Card key={e.name}>
                <CardContent className="pt-4 pb-3 text-center">
                  <e.icon className="w-5 h-5 mx-auto mb-1.5 text-accent" />
                  <p className="text-xl font-bold">{e.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{e.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.topPages || []).map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">{p.name}</code>
                    </div>
                    <Badge variant="secondary">{p.value.toLocaleString()} views</Badge>
                  </div>
                ))}
                {(stats?.topPages || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No page view data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Funnel</CardTitle>
              <CardDescription>Drop-off at each step</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const funnel = [
                  { step: 'Page Views', count: stats?.counts['page_view'] || 0 },
                  { step: 'Product Views', count: stats?.counts['product_view'] || 0 },
                  { step: 'Add to Cart', count: stats?.counts['add_to_cart'] || 0 },
                  { step: 'Begin Checkout', count: stats?.counts['begin_checkout'] || 0 },
                  { step: 'Purchases', count: stats?.counts['purchase'] || 0 },
                ];
                const maxCount = Math.max(...funnel.map(f => f.count), 1);
                return (
                  <div className="space-y-4">
                    {funnel.map((f, i) => {
                      const pct = ((f.count / maxCount) * 100).toFixed(0);
                      const dropoff = i > 0 && funnel[i - 1].count > 0
                        ? ((1 - f.count / funnel[i - 1].count) * 100).toFixed(1)
                        : null;
                      return (
                        <div key={f.step}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{f.step}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{f.count.toLocaleString()}</span>
                              {dropoff && (
                                <Badge variant="destructive" className="text-xs">
                                  -{dropoff}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="h-8 bg-muted rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-primary rounded-lg transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Scroll Depth */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scroll Depth Distribution</CardTitle>
              <CardDescription>How far users scroll on pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.scrollDist || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="depth" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attribution Tab */}
        <TabsContent value="attribution" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.devices || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(stats?.devices || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {(stats?.devices || []).map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <DeviceIcon type={d.name} />
                      <span className="text-sm capitalize">{d.name}</span>
                      <Badge variant="secondary">{d.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* UTM Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent" />
                  Traffic Sources (UTM)
                </CardTitle>
                <CardDescription>Where your traffic comes from</CardDescription>
              </CardHeader>
              <CardContent>
                {(stats?.utmSources || []).length > 0 ? (
                  <div className="space-y-3">
                    {stats!.utmSources.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <Badge variant="outline">{s.value} events</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No UTM-tagged traffic yet</p>
                    <p className="text-xs mt-1">Add ?utm_source=... to your ad URLs</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Exit Intent Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Exit Intent Signals</CardTitle>
                <CardDescription>Users showing intent to leave</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-4xl font-bold text-destructive">
                    {(stats?.counts['exit_intent'] || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Exit intents detected</p>
                  {stats && (stats.counts['page_view'] || 0) > 0 && (
                    <Badge variant="outline" className="mt-3">
                      {(((stats.counts['exit_intent'] || 0) / (stats.counts['page_view'] || 1)) * 100).toFixed(1)}% of sessions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Impression vs Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'View → Cart', from: stats?.counts['product_view'] || 0, to: stats?.counts['add_to_cart'] || 0 },
                    { label: 'View → Wishlist', from: stats?.counts['product_view'] || 0, to: stats?.counts['wishlist_add'] || 0 },
                    { label: 'Search → View', from: stats?.counts['search'] || 0, to: stats?.counts['product_view'] || 0 },
                    { label: 'Cart → Purchase', from: stats?.counts['add_to_cart'] || 0, to: stats?.counts['purchase'] || 0 },
                  ].map(r => {
                    const rate = r.from > 0 ? ((r.to / r.from) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="text-sm">{r.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(parseFloat(rate), 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold w-14 text-right">{rate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Engaged Users</CardTitle>
              <CardDescription>Users ranked by engagement score (updated every 5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              {(profiles || []).length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-border">
                    <span>#</span>
                    <span>Score</span>
                    <span>Page Views</span>
                    <span>Product Views</span>
                    <span>Add to Cart</span>
                    <span>Purchases</span>
                    <span>Last Active</span>
                  </div>
                  {profiles!.map((p: any, i: number) => (
                    <div key={p.id} className="grid grid-cols-7 gap-2 items-center text-sm">
                      <span className="font-bold text-muted-foreground">{i + 1}</span>
                      <Badge variant={p.engagement_score >= 80 ? 'default' : p.engagement_score >= 40 ? 'secondary' : 'outline'}>
                        {p.engagement_score}
                      </Badge>
                      <span>{p.total_page_views}</span>
                      <span>{p.total_product_views}</span>
                      <span>{p.total_add_to_cart}</span>
                      <span>{p.total_purchases}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.last_active_at ? new Date(p.last_active_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No user profiles synced yet</p>
                  <p className="text-xs mt-1">Profiles auto-sync every 5 minutes for logged-in users</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
