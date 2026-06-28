import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, Shield } from 'lucide-react';

type Row = {
  id: string;
  identifier: string;
  identifier_type: string;
  channel: string;
  reason: string;
  source: string | null;
  suppressed_until: string | null;
  created_at: string;
};

const TYPES = ['email', 'phone', 'user_id', 'device_token'];
const CHANNELS = ['all', 'email', 'sms', 'push', 'whatsapp'];

export function CrossChannelSuppressions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    identifier: '',
    identifier_type: 'email',
    channel: 'all',
    reason: 'manual_admin_block',
  });
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('cross_channel_suppressions' as any) as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.identifier.trim()) return toast.error('Identifier required');
    const { error } = await (supabase.from('cross_channel_suppressions' as any) as any).insert(form);
    if (error) return toast.error(error.message);
    toast.success('Suppression added');
    setForm({ ...form, identifier: '' });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from('cross_channel_suppressions' as any) as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const filtered = rows.filter(
    (r) => !filter || r.identifier.toLowerCase().includes(filter.toLowerCase()) || r.reason.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Cross-Channel Suppressions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5 items-end">
            <div className="md:col-span-2">
              <Label>Identifier</Label>
              <Input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.identifier_type} onValueChange={(v) => setForm({ ...form, identifier_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Suppressions ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-3 max-w-sm" />
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Identifier</th>
                    <th>Type</th>
                    <th>Channel</th>
                    <th>Reason</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 font-mono text-xs">{r.identifier}</td>
                      <td><Badge variant="outline">{r.identifier_type}</Badge></td>
                      <td><Badge>{r.channel}</Badge></td>
                      <td className="text-muted-foreground">{r.reason}</td>
                      <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No suppressions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
