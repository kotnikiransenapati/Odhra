import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Mail, MessageSquare, Bell, Phone } from 'lucide-react';
import { format } from 'date-fns';

const CHANNELS = ['all', 'email', 'sms', 'push', 'whatsapp'] as const;

interface Row {
  channel: string; occurred_at: string; status: string;
  subject: string | null; recipient: string | null; provider_id: string | null;
  metadata: Record<string, any>;
}

interface Props { customerId: string; }

const channelIcon: Record<string, any> = {
  email: Mail, sms: MessageSquare, push: Bell, whatsapp: Phone,
};

export function CustomerCommunicationLog({ customerId }: Props) {
  const [channel, setChannel] = useState<typeof CHANNELS[number]>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.rpc('admin_customer_communications' as any, { _user_id: customerId, _channel: channel, _limit: 200 }),
      supabase.rpc('admin_customer_communications_stats' as any, { _user_id: customerId }),
    ]);
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };

  useEffect(() => { if (customerId) load(); /* eslint-disable-next-line */ }, [customerId, channel]);

  const statusVariant = (s: string): any => {
    const v = s?.toLowerCase();
    if (['delivered', 'opened', 'clicked', 'read', 'sent'].includes(v)) return 'default';
    if (['bounced', 'failed', 'complained', 'undelivered'].includes(v)) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Emails', v: stats.email_count ?? 0, icon: Mail },
          { l: 'SMS', v: stats.sms_count ?? 0, icon: MessageSquare },
          { l: 'Push', v: stats.push_count ?? 0, icon: Bell },
          { l: 'WhatsApp', v: stats.whatsapp_count ?? 0, icon: Phone },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.l}</p>
                  <p className="text-2xl font-bold mt-1">{k.v}</p>
                </div>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Timeline</CardTitle>
          <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
            <SelectTrigger className="w-40 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No communications found.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>When</TableHead><TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead><TableHead>Subject / Template</TableHead>
                  <TableHead>Recipient</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const Icon = channelIcon[r.channel] ?? Mail;
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.occurred_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell><Badge variant="outline" className="gap-1"><Icon className="w-3 h-3" />{r.channel}</Badge></TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={r.subject || ''}>{r.subject || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.recipient || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
