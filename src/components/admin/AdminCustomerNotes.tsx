import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { StickyNote, Pin, Archive, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['general', 'billing', 'fraud', 'support', 'vip'] as const;

interface Note {
  id: string; customer_id: string; author_id: string; author_email: string | null;
  category: string; body: string; is_pinned: boolean; is_archived: boolean;
  created_at: string; updated_at: string;
}

interface Props { customerId: string; }

export function AdminCustomerNotes({ customerId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<any>({});
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('general');
  const [pinned, setPinned] = useState(false);

  const load = async () => {
    setLoading(true);
    const [n, s] = await Promise.all([
      supabase.rpc('admin_customer_notes_list' as any, { _customer_id: customerId, _include_archived: includeArchived }),
      supabase.rpc('admin_customer_notes_stats' as any, { _customer_id: customerId }),
    ]);
    if (n.error) toast.error(n.error.message); else setNotes((n.data as Note[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };

  useEffect(() => { if (customerId) load(); /* eslint-disable-next-line */ }, [customerId, includeArchived]);

  const add = async () => {
    if (!body.trim()) { toast.error('Note body required'); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error('Not authenticated'); return; }
    const { error } = await supabase.from('admin_customer_notes' as any).insert({
      customer_id: customerId, author_id: u.user.id, category, body: body.trim(), is_pinned: pinned,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Note added');
    setBody(''); setPinned(false); setCategory('general');
    load();
  };

  const update = async (id: string, patch: Partial<Note>) => {
    const { error } = await supabase.from('admin_customer_notes' as any).update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this note permanently?')) return;
    const { error } = await supabase.from('admin_customer_notes' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const catVariant = (c: string): any =>
    c === 'fraud' ? 'destructive' : c === 'vip' ? 'default' : c === 'billing' ? 'secondary' : 'outline';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2"><StickyNote className="w-5 h-5" /> Internal Notes</h3>
        <Badge variant="outline">{stats.total ?? 0} total</Badge>
        {(stats.pinned ?? 0) > 0 && <Badge>{stats.pinned} pinned</Badge>}
        {(stats.fraud ?? 0) > 0 && <Badge variant="destructive">{stats.fraud} fraud</Badge>}
        {(stats.vip ?? 0) > 0 && <Badge>{stats.vip} VIP</Badge>}
        <div className="ml-auto flex items-center gap-2">
          <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} id="arch" />
          <Label htmlFor="arch" className="text-xs">Show archived</Label>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">New Note</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Internal note (max 4000 chars)…" rows={3} maxLength={4000} />
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={pinned} onCheckedChange={setPinned} id="pin" />
              <Label htmlFor="pin" className="text-xs">Pin to top</Label>
            </div>
            <Button onClick={add} className="ml-auto"><Plus className="w-4 h-4 mr-1" />Add Note</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
       notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : (
        <div className="space-y-2">
          {notes.map(n => (
            <Card key={n.id} className={n.is_archived ? 'opacity-60' : ''}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant={catVariant(n.category)}>{n.category}</Badge>
                  {n.is_pinned && <Badge variant="outline"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>}
                  {n.is_archived && <Badge variant="secondary">Archived</Badge>}
                  <span className="text-muted-foreground">{n.author_email || n.author_id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-auto">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => update(n.id, { is_pinned: !n.is_pinned })}>
                    <Pin className="w-3 h-3 mr-1" />{n.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(n.id, { is_archived: !n.is_archived })}>
                    <Archive className="w-3 h-3 mr-1" />{n.is_archived ? 'Restore' : 'Archive'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
