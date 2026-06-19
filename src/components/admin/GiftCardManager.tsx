import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Plus, Search, Copy, Check, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type GC = {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
  currency: string;
  status: string;
  recipient_name: string | null;
  issued_to_email: string | null;
  sender_name: string | null;
  expires_at: string | null;
  issued_at: string;
  redeemed_at: string | null;
  total_redemptions: number;
  total_count: number;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/30',
  redeemed: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-warning/15 text-warning border-warning/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function GiftCardManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [issueOpen, setIssueOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [expiryDays, setExpiryDays] = useState('365');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gift-cards', status, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_giftcards_list', {
        p_status: status === 'all' ? null : status,
        p_search: search || null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data || []) as GC[];
    },
  });

  const issue = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      const { data, error } = await supabase.rpc('admin_giftcard_issue', {
        p_amount: amt,
        p_recipient_email: recipientEmail || null,
        p_recipient_user_id: null,
        p_recipient_name: recipientName || null,
        p_sender_name: senderName || null,
        p_message: message || null,
        p_expires_days: expiryDays ? parseInt(expiryDays) : null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (row: any) => {
      toast.success(`Gift card issued: ${row?.code}`);
      qc.invalidateQueries({ queryKey: ['admin-gift-cards'] });
      setIssueOpen(false);
      setAmount(''); setRecipientEmail(''); setRecipientName('');
      setSenderName(''); setMessage(''); setExpiryDays('365');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to issue'),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_giftcard_cancel', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Gift card cancelled');
      qc.invalidateQueries({ queryKey: ['admin-gift-cards'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to cancel'),
  });

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
    toast.success('Code copied');
  };

  const totalIssued = (data || []).reduce((s, g) => s + Number(g.initial_amount), 0);
  const totalRemaining = (data || []).reduce((s, g) => s + Number(g.balance), 0);
  const activeCount = (data || []).filter(g => g.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Gift className="w-6 h-6" /> Gift Cards</h2>
          <p className="text-sm text-muted-foreground">Issue, track, and manage marketplace gift cards.</p>
        </div>
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Issue Gift Card</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Issue New Gift Card</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="gc-amount">Amount (₹) *</Label>
                <Input id="gc-amount" type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gc-rname">Recipient name</Label>
                  <Input id="gc-rname" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="gc-remail">Recipient email</Label>
                  <Input id="gc-remail" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gc-sender">Sender name</Label>
                  <Input id="gc-sender" value={senderName} onChange={e => setSenderName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="gc-expiry">Expires in (days)</Label>
                  <Input id="gc-expiry" type="number" min="1" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="gc-msg">Message (optional)</Label>
                <Textarea id="gc-msg" rows={3} maxLength={500} value={message} onChange={e => setMessage(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
                {issue.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Issue Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active cards</p><p className="text-2xl font-bold">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total issued value</p><p className="text-2xl font-bold">₹{totalIssued.toLocaleString('en-IN')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="text-2xl font-bold">₹{totalRemaining.toLocaleString('en-IN')}</p></CardContent></Card>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, email, name" className="pl-9" />
          </div>
        </div>

        <TabsContent value={status} className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{data?.length ?? 0} card{data?.length === 1 ? '' : 's'}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : !data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No gift cards found.</p>
              ) : (
                <div className="space-y-2">
                  {data.map(g => (
                    <div key={g.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-border rounded-lg hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => copy(g.code)} className="font-mono text-sm font-semibold flex items-center gap-1.5 hover:text-accent">
                            {g.code}
                            {copied === g.code ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                          </button>
                          <Badge variant="outline" className={STATUS_COLORS[g.status]}>{g.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {g.recipient_name || g.issued_to_email || 'Unassigned'} • Issued {format(new Date(g.issued_at), 'PP')}
                          {g.expires_at && ` • Expires ${format(new Date(g.expires_at), 'PP')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold">₹{Number(g.balance).toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-muted-foreground">of ₹{Number(g.initial_amount).toLocaleString('en-IN')}</p>
                        </div>
                        {g.status === 'active' && (
                          <Button size="sm" variant="ghost" onClick={() => cancel.mutate(g.id)} aria-label="Cancel gift card">
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GiftCardManager;
