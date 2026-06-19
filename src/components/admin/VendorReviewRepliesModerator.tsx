import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Check, X, Flag, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Row = {
  review_id: string;
  product_id: string;
  product_title: string;
  rating: number;
  review_content: string | null;
  vendor_reply: string;
  vendor_replied_at: string | null;
  vendor_reply_status: string;
  vendor_brand: string | null;
  vendor_id: string;
  total_count: number;
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  flagged: 'bg-accent/15 text-accent border-accent/30',
};

export function VendorReviewRepliesModerator() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [active, setActive] = useState<Row | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-review-replies', status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_review_replies_list', {
        p_status: status,
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: string; notes?: string }) => {
      const { error } = await supabase.rpc('admin_review_reply_moderate', {
        p_review_id: id,
        p_decision: decision,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Reply ${vars.decision}`);
      qc.invalidateQueries({ queryKey: ['admin-review-replies'] });
      setActive(null);
      setNotes('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" /> Vendor Reply Moderation
        </h2>
        <p className="text-sm text-muted-foreground">Approve, reject, or flag vendor responses to product reviews before they go public.</p>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isLoading ? '...' : `${data?.length ?? 0} ${status} repl${data?.length === 1 ? 'y' : 'ies'}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : !data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No replies in this state.</p>
              ) : (
                <div className="space-y-3">
                  {data.map(r => (
                    <div key={r.review_id} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{r.product_title}</p>
                            <Badge variant="outline" className={STATUS_STYLES[r.vendor_reply_status]}>
                              {r.vendor_reply_status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            By {r.vendor_brand || 'vendor'}
                            {r.vendor_replied_at && ` • ${format(new Date(r.vendor_replied_at), 'PPp')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 text-warning shrink-0">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {r.review_content && (
                        <div className="p-3 bg-muted/40 rounded text-sm">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">CUSTOMER REVIEW</p>
                          <p className="text-foreground/90 line-clamp-3">{r.review_content}</p>
                        </div>
                      )}

                      <div className="p-3 bg-accent/5 border border-accent/20 rounded text-sm">
                        <p className="text-xs font-semibold text-accent mb-1">VENDOR REPLY</p>
                        <p className="text-foreground/90 whitespace-pre-wrap">{r.vendor_reply}</p>
                      </div>

                      {(r.vendor_reply_status === 'pending' || r.vendor_reply_status === 'flagged') && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" onClick={() => moderate.mutate({ id: r.review_id, decision: 'approved' })} disabled={moderate.isPending} className="gap-1.5">
                            <Check className="w-4 h-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setActive(r); }} className="gap-1.5">
                            <X className="w-4 h-4" /> Reject
                          </Button>
                          {r.vendor_reply_status !== 'flagged' && (
                            <Button size="sm" variant="ghost" onClick={() => moderate.mutate({ id: r.review_id, decision: 'flagged' })} disabled={moderate.isPending} className="gap-1.5">
                              <Flag className="w-4 h-4" /> Flag
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setNotes(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Vendor Reply</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">The reply will be hidden from customers. Provide moderation notes for the vendor.</p>
            <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Reply contains contact information against policy." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActive(null); setNotes(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => active && moderate.mutate({ id: active.review_id, decision: 'rejected', notes })} disabled={moderate.isPending}>
              {moderate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VendorReviewRepliesModerator;
