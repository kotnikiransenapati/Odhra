import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCheck, ShoppingCart, Package, DollarSign, AlertTriangle,
  Star, Info, Loader2, Inbox, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ReactNode> = {
  order: <ShoppingCart className="w-4 h-4" />,
  product: <Package className="w-4 h-4" />,
  payment: <DollarSign className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />,
  review: <Star className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  order: 'bg-accent/10 text-accent',
  product: 'bg-primary/10 text-primary',
  payment: 'bg-success/10 text-success',
  alert: 'bg-destructive/10 text-destructive',
  review: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

export function VendorNotificationCenter() {
  const queryClient = useQueryClient();
  const { data: vendorId } = useVendorId();
  const [tab, setTab] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['vendor-notifications', vendorId, tab],
    queryFn: async () => {
      if (!vendorId) return [];
      let query = supabase
        .from('vendor_notifications')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (tab === 'unread') query = query.eq('is_read', false);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel('vendor-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendor_notifications', filter: `vendor_id=eq.${vendorId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] });
          toast.info((payload.new as any).title, { description: (payload.new as any).message });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendorId, queryClient]);

  // Mark as read
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] }),
  });

  // Mark all as read
  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!vendorId) return;
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ is_read: true })
        .eq('vendor_id', vendorId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 text-xs">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      notification.is_read ? 'bg-secondary/20 hover:bg-secondary/30' : 'bg-accent/5 hover:bg-accent/10 border border-accent/10'
                    }`}
                    onClick={() => !notification.is_read && markRead.mutate(notification.id)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[notification.type] || typeColors.info}`}>
                      {typeIcons[notification.type] || typeIcons.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No notifications</p>
                    <p className="text-xs mt-1">You're all caught up!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
