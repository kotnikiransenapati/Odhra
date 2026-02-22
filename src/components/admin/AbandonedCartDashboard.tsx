import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Mail, CheckCircle, Clock, Loader2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export function AbandonedCartDashboard() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['abandoned-cart-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_abandonment_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-carts'],
    queryFn: async () => {
      const ids = [...new Set(events.map((e: any) => e.user_id))];
      if (ids.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, email, full_name').in('id', ids);
      return data || [];
    },
    enabled: events.length > 0,
  });

  const total = events.length;
  const recovered = events.filter((e: any) => e.recovered).length;
  const emailSent = events.filter((e: any) => e.email_sent).length;
  const recoveryRate = total > 0 ? ((recovered / total) * 100).toFixed(1) : '0';
  const estimatedValue = events
    .filter((e: any) => !e.recovered)
    .reduce((sum: number, e: any) => {
      const cart = e.cart_snapshot;
      if (Array.isArray(cart)) {
        return sum + cart.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
      }
      return sum;
    }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Abandoned Cart Recovery</h2>
        <p className="text-muted-foreground text-sm">Track abandoned carts, recovery rates, and follow-up campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Abandoned Carts</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{recovered}</p><p className="text-xs text-muted-foreground">Recovered ({recoveryRate}%)</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Mail className="w-5 h-5 text-info" /></div>
            <div><p className="text-2xl font-bold">{emailSent}</p><p className="text-xs text-muted-foreground">Emails Sent</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">₹{estimatedValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Lost Revenue</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Cart Items</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Email Sent</TableHead>
                <TableHead>Recovered</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : events.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No abandoned cart events tracked</TableCell></TableRow>
              ) : (
                events.map((event: any) => {
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
                      <TableCell>
                        <Badge variant="outline">{cart.length} items</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">₹{cartValue.toLocaleString()}</TableCell>
                      <TableCell>
                        {event.email_sent ? (
                          <Badge className="bg-info/10 text-info">Sent</Badge>
                        ) : (
                          <Badge variant="secondary">Not sent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.recovered ? (
                          <Badge className="bg-success/10 text-success gap-1"><CheckCircle className="w-3 h-3" />Recovered</Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive gap-1"><AlertTriangle className="w-3 h-3" />Lost</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
