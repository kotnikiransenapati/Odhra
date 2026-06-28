import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, Mail, Bell, MessageSquare, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Row = {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  created_at: string;
  is_read: boolean | null;
};

const CHANNEL_ICON: Record<string, JSX.Element> = {
  email: <Mail className="w-3.5 h-3.5" aria-hidden />,
  push: <Bell className="w-3.5 h-3.5" aria-hidden />,
  inapp: <MessageSquare className="w-3.5 h-3.5" aria-hidden />,
};

/**
 * Read-only feed of recent messages we've sent to this customer
 * (in-app notifications row store). Useful for transparency / debugging.
 */
export function CommunicationLog() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['comm-log', user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('notifications')
        .select('id, title, body, type, created_at, is_read')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(25);
      if (filter === 'unread') q = q.eq('is_read', false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <Card className="glass" role="region" aria-labelledby="comm-log-title">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle id="comm-log-title" className="text-lg flex items-center gap-2">
            <Inbox className="w-5 h-5 text-accent" aria-hidden /> Communication log
          </CardTitle>
          <CardDescription>Recent messages we've sent you across channels</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Filter messages" className="flex rounded-md border bg-background p-0.5">
            {(['all', 'unread'] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                  filter === k ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {k === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refresh communication log"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ul className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </ul>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No messages yet.</p>
        ) : (
          <ul className="divide-y -my-2">
            {data.map((n) => {
              const channel = (n.type || 'inapp').toLowerCase();
              const icon = CHANNEL_ICON[channel] ?? CHANNEL_ICON.inapp;
              return (
                <li key={n.id} className="py-3 flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 text-accent">
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.is_read && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      {n.type ? ` · ${n.type}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
