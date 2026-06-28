import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowUpRight, BellRing, CheckCheck, ExternalLink, Inbox, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: string;
  cta_label: string | null;
  cta_url: string | null;
  publish_at: string | null;
  expires_at: string | null;
  is_read: boolean;
};

const priorityTone: Record<Announcement['priority'], string> = {
  low: 'border-border text-muted-foreground',
  normal: 'border-accent/30 text-accent',
  high: 'border-warning/30 text-warning bg-warning/10',
  critical: 'border-destructive/30 text-destructive bg-destructive/10',
};

export function VendorAnnouncementsInbox() {
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['vendor-announcements-inbox'],
    staleTime: 30_000,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase.rpc('vendor_my_announcements' as any);
      if (error) throw error;
      return (data as Announcement[]) ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('vendor_mark_announcement_read' as any, { _announcement_id: id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-announcements-inbox'] }),
    onError: (error: any) => toast.error(error.message || 'Could not mark announcement as read'),
  });

  const markAll = async () => {
    const unread = announcements.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    await Promise.all(unread.map((a) => markRead.mutateAsync(a.id)));
    toast.success('Announcements marked as read');
  };

  const unreadCount = announcements.filter((a) => !a.is_read).length;
  const criticalCount = announcements.filter((a) => a.priority === 'critical' && !a.is_read).length;

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-accent" /> Vendor Announcements
              {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Policy, payout, product, and outage updates from the marketplace team.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {criticalCount > 0 && <Badge variant="outline" className="border-destructive/30 text-destructive"><AlertTriangle className="w-3 h-3 mr-1" />{criticalCount} critical</Badge>}
            <Button variant="outline" size="sm" className="gap-2" onClick={markAll} disabled={unreadCount === 0 || markRead.isPending}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No announcements</p>
            <p className="text-xs mt-1">Important marketplace updates will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className={`rounded-xl border p-4 transition-colors ${announcement.is_read ? 'border-border/40 bg-secondary/20' : 'border-accent/20 bg-accent/5'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className={priorityTone[announcement.priority]}>{announcement.priority}</Badge>
                      <Badge variant="secondary" className="capitalize">{announcement.category}</Badge>
                      {!announcement.is_read && <Badge variant="outline" className="border-accent/30 text-accent"><BellRing className="w-3 h-3 mr-1" />New</Badge>}
                      {announcement.publish_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(announcement.publish_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{announcement.body}</p>
                  </div>
                  {!announcement.is_read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(announcement.id)} disabled={markRead.isPending}>
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {announcement.cta_url && announcement.cta_label && (
                  <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                    <a href={announcement.cta_url} target={announcement.cta_url.startsWith('/') ? undefined : '_blank'} rel="noreferrer">
                      {announcement.cta_label}
                      {announcement.cta_url.startsWith('/') ? <ArrowUpRight className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                    </a>
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}