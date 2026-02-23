import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, subDays } from 'date-fns';
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
  TrendingUp, AlertTriangle, RefreshCw, BarChart3, ArrowRight,
  Send, Filter, Eye, Target
} from 'lucide-react';

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

  // Manual email trigger
  const triggerEmail = useMutation({
    mutationFn: async (eventId: string) => {
      const event = events.find((e: any) => e.id === eventId);
      if (!event) throw new Error('Event not found');
      const { error } = await supabase.functions.invoke('cart-abandonment-email', {
        body: { userId: event.user_id, cartItems: event.cart_snapshot },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recovery email triggered');
      queryClient.invalidateQueries({ queryKey: ['abandoned-cart-events'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Compute stats
  const total = events.length;
  const recovered = events.filter((e: any) => e.recovered).length;
  const emailSent = events.filter((e: any) => e.email_sent).length;
  const step1 = events.filter((e: any) => e.email_step >= 1).length;
  const step2 = events.filter((e: any) => e.email_step >= 2).length;
  const step3 = events.filter((e: any) => e.email_step >= 3).length;
  const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
  const emailOpenRate = emailSent > 0 ? ((recovered / emailSent) * 100) : 0;

  const estimatedLostRevenue = events
    .filter((e: any) => !e.recovered)
    .reduce((sum: number, e: any) => {
      const cart = e.cart_snapshot;
      if (Array.isArray(cart)) {
        return sum + cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
      }
      return sum;
    }, 0);

  const recoveredRevenue = events
    .filter((e: any) => e.recovered)
    .reduce((sum: number, e: any) => {
      const cart = e.cart_snapshot;
      if (Array.isArray(cart)) {
        return sum + cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
      }
      return sum;
    }, 0);

  // Filter events
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
          <p className="text-muted-foreground text-sm">Multi-step drip campaign analytics & recovery tracking</p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Abandoned Carts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recovered} <span className="text-sm font-normal text-muted-foreground">({recoveryRate.toFixed(1)}%)</span></p>
              <p className="text-xs text-muted-foreground">Recovered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(recoveredRevenue)}</p>
              <p className="text-xs text-muted-foreground">Revenue Recovered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(estimatedLostRevenue)}</p>
              <p className="text-xs text-muted-foreground">Lost Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel" className="gap-2"><BarChart3 className="w-4 h-4" />Email Funnel</TabsTrigger>
          <TabsTrigger value="events" className="gap-2"><Eye className="w-4 h-4" />All Events</TabsTrigger>
        </TabsList>

        {/* Email Drip Funnel */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3-Step Email Drip Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { step: 1, label: 'Step 1 — Gentle Reminder (1hr)', count: step1, emoji: '💌' },
                { step: 2, label: 'Step 2 — Urgency + 10% Off (24hr)', count: step2, emoji: '⚡' },
                { step: 3, label: 'Step 3 — Final Chance (72hr)', count: step3, emoji: '🔥' },
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
                  <span className="text-sm font-medium">🎯 Email → Recovery Rate</span>
                  <span className="font-bold text-success">{emailOpenRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">💰 Avg Cart Value (Lost)</span>
                  <span className="font-bold">
                    {formatPrice(events.filter((e: any) => !e.recovered).length > 0
                      ? estimatedLostRevenue / events.filter((e: any) => !e.recovered).length
                      : 0)}
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
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
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
                    <TableHead>Email Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events found</TableCell></TableRow>
                  ) : (
                    filteredEvents.slice(0, 50).map((event: any) => {
                      const profile = profiles.find((p: any) => p.id === event.user_id);
                      const cart = Array.isArray(event.cart_snapshot) ? event.cart_snapshot : [];
                      const cartValue = cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{profile?.email || event.user_id?.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{cart.length} items</Badge></TableCell>
                          <TableCell className="font-semibold">{formatPrice(cartValue)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(s => (
                                <div
                                  key={s}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    (event.email_step || 0) >= s
                                      ? 'bg-accent text-accent-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {s}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.recovered ? (
                              <Badge className="bg-success/10 text-success gap-1"><CheckCircle className="w-3 h-3" />Recovered</Badge>
                            ) : event.email_sent ? (
                              <Badge className="bg-info/10 text-info gap-1"><Mail className="w-3 h-3" />Emailed</Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive gap-1"><AlertTriangle className="w-3 h-3" />Lost</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {!event.recovered && (event.email_step || 0) < 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => triggerEmail.mutate(event.id)}
                                disabled={triggerEmail.isPending}
                              >
                                <Send className="w-3 h-3" />
                                Send
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
      </Tabs>
    </div>
  );
}
