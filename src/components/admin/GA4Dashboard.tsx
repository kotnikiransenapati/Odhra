import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIntegration, useUpdateIntegration } from '@/hooks/useIntegrationSettings';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import {
  BarChart3, TrendingUp, Users, Eye, ShoppingCart, MousePointer,
  Settings, Save, Loader2, CheckCircle, XCircle, ExternalLink,
  Activity, Globe, Target, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#f59e0b', '#10b981', '#8b5cf6'];

export function GA4Dashboard() {
  const { isEnabled, config } = useIntegration('google_analytics');
  const updateIntegration = useUpdateIntegration();
  const [localConfig, setLocalConfig] = useState({
    measurement_id: config.measurement_id || '',
    stream_id: config.stream_id || '',
  });

  // Fetch analytics events from our DB for dashboard display
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['ga4-admin-events'],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  // Compute stats
  const pageViews = events.filter(e => e.event_type === 'page_view').length;
  const purchases = events.filter(e => e.event_type === 'purchase').length;
  const addToCarts = events.filter(e => e.event_type === 'add_to_cart').length;
  const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size;
  const uniqueSessions = new Set(events.map(e => e.session_id)).size;

  // Daily breakdown
  const dailyData: Record<string, { date: string; views: number; carts: number; purchases: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    dailyData[d] = { date: format(subDays(new Date(), i), 'MMM dd'), views: 0, carts: 0, purchases: 0 };
  }
  events.forEach(e => {
    const d = e.created_at.slice(0, 10);
    if (dailyData[d]) {
      if (e.event_type === 'page_view') dailyData[d].views++;
      if (e.event_type === 'add_to_cart') dailyData[d].carts++;
      if (e.event_type === 'purchase') dailyData[d].purchases++;
    }
  });
  const trendData = Object.values(dailyData);

  // Event type distribution
  const eventCounts: Record<string, number> = {};
  events.forEach(e => { eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1; });
  const pieData = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Top pages
  const pageCounts: Record<string, number> = {};
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    const path = (e.properties as any)?.page_path || (e.properties as any)?.path || '/';
    pageCounts[path] = (pageCounts[path] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const handleSave = async () => {
    try {
      await updateIntegration.mutateAsync({
        integration_key: 'google_analytics',
        config: localConfig,
      });
      toast.success('GA4 configuration saved');
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateIntegration.mutateAsync({ integration_key: 'google_analytics', is_enabled: enabled });
      toast.success(`Google Analytics ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Google Analytics 4</h2>
          <p className="text-muted-foreground">Manage GA4 tracking, view conversion metrics and page analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isEnabled ? 'default' : 'secondary'}>{isEnabled ? 'Active' : 'Inactive'}</Badge>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Page Views', value: pageViews, icon: Eye, color: 'text-primary' },
              { label: 'Unique Users', value: uniqueUsers, icon: Users, color: 'text-accent' },
              { label: 'Sessions', value: uniqueSessions, icon: Globe, color: 'text-secondary-foreground' },
              { label: 'Add to Cart', value: addToCarts, icon: ShoppingCart, color: 'text-warning' },
              { label: 'Purchases', value: purchases, icon: Target, color: 'text-success' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">7-Day Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Page Views" />
                  <Line type="monotone" dataKey="carts" stroke="#f59e0b" strokeWidth={2} name="Add to Cart" />
                  <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} name="Purchases" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Event Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Events</CardTitle>
              <CardDescription>Last 50 tracked events from all users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.session_id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.user_id ? `${e.user_id.slice(0, 8)}...` : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(e.created_at), 'MMM dd HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No events recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Pages</CardTitle>
              <CardDescription>Most visited pages in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Path</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map(([path, count]) => (
                    <TableRow key={path}>
                      <TableCell className="font-mono text-sm">{path}</TableCell>
                      <TableCell className="text-right font-medium">{count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {pageViews > 0 ? ((count / pageViews) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {topPages.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No page views recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> GA4 Configuration</CardTitle>
              <CardDescription>Configure your Google Analytics 4 property for event tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Measurement ID</Label>
                <Input value={localConfig.measurement_id} onChange={e => setLocalConfig(c => ({ ...c, measurement_id: e.target.value }))} placeholder="G-XXXXXXXXXX" />
                <p className="text-xs text-muted-foreground">Found in GA4 → Admin → Data Streams</p>
              </div>
              <div className="space-y-2">
                <Label>Stream ID (optional)</Label>
                <Input value={localConfig.stream_id} onChange={e => setLocalConfig(c => ({ ...c, stream_id: e.target.value }))} placeholder="1234567890" />
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Tracked E-Commerce Events</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['page_view', 'view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'search', 'sign_up', 'login', 'view_item_list', 'select_item', 'add_to_wishlist'].map(event => (
                    <div key={event} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <CheckCircle className="w-3 h-3 text-success" />
                      <span className="text-xs font-mono">{event}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateIntegration.isPending} className="gap-2">
                {updateIntegration.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">analytics.google.com</a></li>
                <li>Create or select your GA4 property</li>
                <li>Navigate to Admin → Data Streams → Web</li>
                <li>Copy the <strong>Measurement ID</strong> (starts with G-)</li>
                <li>Paste it above and save</li>
              </ol>
              <p className="text-xs">Events are automatically tracked when GA4 is enabled — no code changes needed.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
