import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIntegration, useUpdateIntegration } from '@/hooks/useIntegrationSettings';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import {
  BarChart3, Eye, ShoppingCart, Target, Settings, Save, Loader2,
  CheckCircle, MousePointer, DollarSign, Users, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function FBPixelDashboard() {
  const { isEnabled, config } = useIntegration('facebook_pixel');
  const updateIntegration = useUpdateIntegration();
  const [localConfig, setLocalConfig] = useState({
    pixel_id: config.pixel_id || '',
    access_token: config.access_token || '',
  });

  const { data: events = [] } = useQuery({
    queryKey: ['fbpixel-admin-events'],
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

  // FB Pixel event mapping from internal events
  const fbEvents = {
    PageView: events.filter(e => e.event_type === 'page_view').length,
    ViewContent: events.filter(e => e.event_type === 'view_item' || e.event_type === 'product_view').length,
    AddToCart: events.filter(e => e.event_type === 'add_to_cart').length,
    InitiateCheckout: events.filter(e => e.event_type === 'begin_checkout').length,
    Purchase: events.filter(e => e.event_type === 'purchase').length,
    Search: events.filter(e => e.event_type === 'search').length,
    AddToWishlist: events.filter(e => e.event_type === 'add_to_wishlist' || e.event_type === 'wishlist_add').length,
    CompleteRegistration: events.filter(e => e.event_type === 'sign_up').length,
    Lead: events.filter(e => e.event_type === 'lead' || e.event_type === 'contact_submit').length,
  };

  // Daily funnel
  const dailyData: Record<string, { date: string; views: number; carts: number; checkouts: number; purchases: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    dailyData[d] = { date: format(subDays(new Date(), i), 'MMM dd'), views: 0, carts: 0, checkouts: 0, purchases: 0 };
  }
  events.forEach(e => {
    const d = e.created_at.slice(0, 10);
    if (dailyData[d]) {
      if (e.event_type === 'page_view') dailyData[d].views++;
      if (e.event_type === 'add_to_cart') dailyData[d].carts++;
      if (e.event_type === 'begin_checkout') dailyData[d].checkouts++;
      if (e.event_type === 'purchase') dailyData[d].purchases++;
    }
  });

  const conversionRate = fbEvents.PageView > 0 ? ((fbEvents.Purchase / fbEvents.PageView) * 100).toFixed(2) : '0';
  const cartRate = fbEvents.ViewContent > 0 ? ((fbEvents.AddToCart / fbEvents.ViewContent) * 100).toFixed(1) : '0';

  const handleSave = async () => {
    try {
      await updateIntegration.mutateAsync({ integration_key: 'facebook_pixel', config: localConfig });
      toast.success('Facebook Pixel configuration saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateIntegration.mutateAsync({ integration_key: 'facebook_pixel', is_enabled: enabled });
      toast.success(`Facebook Pixel ${enabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><MousePointer className="w-6 h-6 text-primary" /> Facebook Pixel</h2>
          <p className="text-muted-foreground">Ad retargeting, conversion tracking and audience analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isEnabled ? 'default' : 'secondary'}>{isEnabled ? 'Active' : 'Inactive'}</Badge>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="events">Event Breakdown</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6">
          {/* Funnel KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Target, color: 'text-success' },
              { label: 'Cart Rate', value: `${cartRate}%`, icon: ShoppingCart, color: 'text-warning' },
              { label: 'Purchases', value: fbEvents.Purchase, icon: DollarSign, color: 'text-primary' },
              { label: 'Registrations', value: fbEvents.CompleteRegistration, icon: Users, color: 'text-accent' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Funnel visualization */}
          <Card>
            <CardHeader><CardTitle className="text-base">Conversion Funnel (30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'PageView', count: fbEvents.PageView, color: 'bg-primary' },
                  { label: 'ViewContent', count: fbEvents.ViewContent, color: 'bg-accent' },
                  { label: 'AddToCart', count: fbEvents.AddToCart, color: 'bg-warning' },
                  { label: 'InitiateCheckout', count: fbEvents.InitiateCheckout, color: 'bg-secondary' },
                  { label: 'Purchase', count: fbEvents.Purchase, color: 'bg-success' },
                ].map(({ label, count, color }) => {
                  const maxCount = fbEvents.PageView || 1;
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground">{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 7-day trend */}
          <Card>
            <CardHeader><CardTitle className="text-base">7-Day Funnel Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.values(dailyData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="PageView" />
                  <Bar dataKey="carts" fill="#f59e0b" name="AddToCart" />
                  <Bar dataKey="purchases" fill="#10b981" name="Purchase" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facebook Pixel Events</CardTitle>
              <CardDescription>Standard and custom events being tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(fbEvents).map(([event, count]) => (
                  <div key={event} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-mono text-sm">{event}</span>
                    </div>
                    <Badge variant="outline">{count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Pixel Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input value={localConfig.pixel_id} onChange={e => setLocalConfig(c => ({ ...c, pixel_id: e.target.value }))} placeholder="1234567890" />
                <p className="text-xs text-muted-foreground">Found in Meta Events Manager → Your Pixel → Settings</p>
              </div>
              <div className="space-y-2">
                <Label>Conversions API Token (optional)</Label>
                <Input type="password" value={localConfig.access_token} onChange={e => setLocalConfig(c => ({ ...c, access_token: e.target.value }))} placeholder="EAAxxxxxx" />
                <p className="text-xs text-muted-foreground">For server-side event deduplication</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Consent Behavior</h4>
                <p className="text-xs text-muted-foreground">
                  Facebook Pixel only fires when the user has accepted <strong>marketing cookies</strong>. This is controlled by the cookie consent banner automatically.
                </p>
              </div>
              <Button onClick={handleSave} disabled={updateIntegration.isPending} className="gap-2">
                {updateIntegration.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Setup Instructions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Events Manager</a></li>
                <li>Select or create a Pixel</li>
                <li>Copy the Pixel ID from the overview screen</li>
                <li>Paste it above and save</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
