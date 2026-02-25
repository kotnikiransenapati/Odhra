import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ShoppingCart, Mail, CheckCircle, Clock, Loader2, DollarSign,
  TrendingUp, AlertTriangle, BarChart3, Send, Filter, Eye,
  MessageCircle, Percent, FlaskConical, Package, PieChart
} from 'lucide-react';
import { AbandonedCartABTests } from './abandoned-cart/ABTestManager';
import { AbandonedCartDiscountRules } from './abandoned-cart/DiscountRulesManager';
import { AbandonedCartProductInsights } from './abandoned-cart/ProductInsights';
import { AbandonedCartCohortAnalysis } from './abandoned-cart/CohortAnalysis';

export function AbandonedCartDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recovered' | 'lost' | 'emailed'>('all');

  const cutoffDate = subDays(new Date(), parseInt(dateRange)).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['abandoned-cart-events', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_abandonment_events')
        .select('*')
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-carts', events.map((e: any) => e.user_id).join(',')],
    queryFn: async () => {
      const ids = [...new Set(events.map((e: any) => e.user_id))];
      if (ids.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, email, full_name').in('id', ids);
      return data || [];
    },
    enabled: events.length > 0,
  });

  const triggerEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('cart-abandonment-email', { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cart recovery emails processed');
      queryClient.invalidateQueries({ queryKey: ['abandoned-cart-events'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = events.length;
  const recovered = events.filter((e: any) => e.recovered).length;
  const emailSent = events.filter((e: any) => e.email_sent).length;
  const whatsappSentCount = events.filter((e: any) => (e as any).whatsapp_sent).length;
  const exitPopupShown = events.filter((e: any) => (e as any).exit_popup_shown).length;
  const exitPopupConverted = events.filter((e: any) => (e as any).exit_popup_converted).length;
  const step1 = events.filter((e: any) => e.email_step >= 1).length;
  const step2 = events.filter((e: any) => e.email_step >= 2).length;
  const step3 = events.filter((e: any) => e.email_step >= 3).length;
  const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;

  // Channel attribution
  const channelBreakdown = {
    email: events.filter((e: any) => (e as any).recovery_channel === 'email').length,
    whatsapp: events.filter((e: any) => (e as any).recovery_channel === 'whatsapp').length,
    exit_popup: events.filter((e: any) => (e as any).recovery_channel === 'exit_popup').length,
    organic: events.filter((e: any) => (e as any).recovery_channel === 'organic').length,
  };

  const estimatedLostRevenue = events
    .filter((e: any) => !e.recovered)
    .reduce((sum: number, e: any) => {
      const val = (e as any).cart_value;
      if (val) return sum + val;
      const cart = e.cart_snapshot;
      if (Array.isArray(cart)) return sum + cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
      return sum;
    }, 0);

  const recoveredRevenue = events
    .filter((e: any) => e.recovered)
    .reduce((sum: number, e: any) => sum + ((e as any).recovered_revenue || (e as any).cart_value || 0), 0);

  const filteredEvents = events.filter((e: any) => {
    if (statusFilter === 'recovered') return e.recovered;
    if (statusFilter === 'lost') return !e.recovered && !e.email_sent;
    if (statusFilter === 'emailed') return e.email_sent && !e.recovered;
    return true;
  });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Abandoned Cart Recovery</h2>
          <p className="text-muted-foreground text-sm">Enterprise multi-channel recovery with dynamic discounts & A/B testing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerEmail.mutate()} disabled={triggerEmail.isPending} className="gap-1">
            <Send className="w-4 h-4" />Process Queue
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-warning" /></div>
          <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Abandoned</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{recovered} <span className="text-sm font-normal text-muted-foreground">({recoveryRate.toFixed(1)}%)</span></p><p className="text-xs text-muted-foreground">Recovered</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-accent" /></div>
          <div><p className="text-2xl font-bold">{formatPrice(recoveredRevenue)}</p><p className="text-xs text-muted-foreground">Recovered Rev</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{formatPrice(estimatedLostRevenue)}</p><p className="text-xs text-muted-foreground">Lost Revenue</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Mail className="w-5 h-5 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{emailSent}</p><p className="text-xs text-muted-foreground">Emails Sent</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600/10 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{whatsappSentCount}</p><p className="text-xs text-muted-foreground">WhatsApp</p></div>
        </CardContent></Card>
      </div>

      {/* Channel Attribution */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Revenue Attribution by Channel</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '📧 Email', count: channelBreakdown.email, color: 'bg-blue-500' },
              { label: '💬 WhatsApp', count: channelBreakdown.whatsapp, color: 'bg-green-500' },
              { label: '🚪 Exit Popup', count: channelBreakdown.exit_popup, color: 'bg-purple-500' },
              { label: '🔄 Organic', count: channelBreakdown.organic, color: 'bg-orange-500' },
            ].map(ch => (
              <div key={ch.label} className="text-center p-3 rounded-lg bg-secondary">
                <p className="text-sm font-medium">{ch.label}</p>
                <p className="text-2xl font-bold mt-1">{ch.count}</p>
                <p className="text-xs text-muted-foreground">recoveries</p>
                <div className={`h-1 ${ch.color} rounded-full mt-2`} style={{ width: `${recovered > 0 ? (ch.count / recovered) * 100 : 0}%` }} />
              </div>
            ))}
          </div>
          {exitPopupShown > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted flex items-center justify-between">
              <span className="text-sm">🚪 Exit Popup: {exitPopupShown} shown → {exitPopupConverted} converted</span>
              <Badge variant="outline">{exitPopupShown > 0 ? ((exitPopupConverted / exitPopupShown) * 100).toFixed(1) : 0}% conversion</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="funnel" className="gap-2"><BarChart3 className="w-4 h-4" />Email Funnel</TabsTrigger>
          <TabsTrigger value="events" className="gap-2"><Eye className="w-4 h-4" />Events</TabsTrigger>
          <TabsTrigger value="cohorts" className="gap-2"><PieChart className="w-4 h-4" />Cohorts</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><Package className="w-4 h-4" />Products</TabsTrigger>
          <TabsTrigger value="ab-tests" className="gap-2"><FlaskConical className="w-4 h-4" />A/B Tests</TabsTrigger>
          <TabsTrigger value="discounts" className="gap-2"><Percent className="w-4 h-4" />Discounts</TabsTrigger>
        </TabsList>

        {/* Email Drip Funnel */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader><CardTitle className="text-lg">3-Step Email Drip Funnel</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {[
                { step: 1, label: 'Step 1 — Gentle Reminder (1hr)', count: step1, emoji: '💌' },
                { step: 2, label: 'Step 2 — Urgency + Dynamic Discount (24hr)', count: step2, emoji: '⚡' },
                { step: 3, label: 'Step 3 — Final Chance + Max Discount (72hr)', count: step3, emoji: '🔥' },
              ].map((s) => {
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.step} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.emoji} {s.label}</span>
                      <span className="text-sm text-muted-foreground">{s.count} sent ({pct.toFixed(1)}%)</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">📧 Total Emails Sent</span>
                  <span className="font-bold">{emailSent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">💬 WhatsApp Messages</span>
                  <span className="font-bold">{whatsappSentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">🎯 Overall Recovery Rate</span>
                  <span className="font-bold text-green-600">{recoveryRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">💰 Avg Cart Value (Lost)</span>
                  <span className="font-bold">
                    {formatPrice(events.filter((e: any) => !e.recovered).length > 0 ? estimatedLostRevenue / events.filter((e: any) => !e.recovered).length : 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Table */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Abandonment Events</CardTitle>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                  <SelectItem value="emailed">Emailed</SelectItem>
                  <SelectItem value="lost">No Email</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No events found</TableCell></TableRow>
                  ) : (
                    filteredEvents.slice(0, 50).map((event: any) => {
                      const profile = profiles.find((p: any) => p.id === event.user_id);
                      const cart = Array.isArray(event.cart_snapshot) ? event.cart_snapshot : [];
                      const cartVal = event.cart_value || cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
                      const segment = event.user_segment;
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email || event.user_id?.slice(0, 8)}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline">{cart.length} items</Badge></TableCell>
                          <TableCell className="font-semibold">{formatPrice(cartVal)}</TableCell>
                          <TableCell>
                            {segment && (
                              <Badge variant="secondary" className="text-xs">
                                {segment === 'high_value' ? '💎 VIP' : segment === 'at_risk' ? '⚠️ At Risk' : segment === 'new' ? '🆕 New' : '🔄 Return'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {event.email_sent && <Badge variant="outline" className="text-xs gap-1"><Mail className="w-3 h-3" />E{event.email_step || 0}</Badge>}
                              {event.whatsapp_sent && <Badge variant="outline" className="text-xs gap-1 text-green-600"><MessageCircle className="w-3 h-3" />WA</Badge>}
                              {event.exit_popup_shown && <Badge variant="outline" className="text-xs">🚪</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.recovered ? (
                              <Badge className="bg-green-500/10 text-green-600 gap-1"><CheckCircle className="w-3 h-3" />{event.recovery_channel || 'Recovered'}</Badge>
                            ) : event.email_sent ? (
                              <Badge className="bg-blue-500/10 text-blue-600 gap-1"><Mail className="w-3 h-3" />Emailed</Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive gap-1"><AlertTriangle className="w-3 h-3" />Lost</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {!event.recovered && (event.email_step || 0) < 3 && (
                              <Button variant="ghost" size="sm" className="gap-1" onClick={() => triggerEmail.mutate()} disabled={triggerEmail.isPending}>
                                <Send className="w-3 h-3" />Send
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohort Analysis */}
        <TabsContent value="cohorts">
          <AbandonedCartCohortAnalysis events={events} formatPrice={formatPrice} />
        </TabsContent>

        {/* Product Insights */}
        <TabsContent value="products">
          <AbandonedCartProductInsights dateRange={dateRange} formatPrice={formatPrice} />
        </TabsContent>

        {/* A/B Tests */}
        <TabsContent value="ab-tests">
          <AbandonedCartABTests />
        </TabsContent>

        {/* Discount Rules */}
        <TabsContent value="discounts">
          <AbandonedCartDiscountRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}
