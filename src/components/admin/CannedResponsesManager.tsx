import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageSquare, Plus, Edit, Trash2, RefreshCw, Copy, Hash } from 'lucide-react';

type Canned = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  usage_count: number | null;
  is_active: boolean | null;
  created_at?: string;
};

const CATEGORIES = ['general', 'order', 'shipping', 'returns', 'refunds', 'product', 'payment', 'account'];

const blank = (): Partial<Canned> => ({
  title: '', content: '', category: 'general', shortcut: '', is_active: true,
});

export function CannedResponsesManager() {
  const [rows, setRows] = useState<Canned[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Canned> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .order('usage_count', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setRows((data as Canned[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (catFilter !== 'all' && (r.category || 'general') !== catFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.shortcut || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, catFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active).length,
    uses: rows.reduce((s, r) => s + (r.usage_count || 0), 0),
  }), [rows]);

  const startEdit = (c?: Canned) => setEditing(c ? { ...c } : blank());

  const save = async () => {
    if (!editing?.title?.trim()) return toast.error('Title required');
    if (!editing.content?.trim()) return toast.error('Content required');
    const shortcut = editing.shortcut?.trim().replace(/^\/+/, '');
    if (shortcut && !/^[a-z0-9_-]+$/i.test(shortcut)) {
      return toast.error('Shortcut may only contain letters, numbers, hyphens, underscores');
    }
    setSaving(true);
    try {
      const payload: any = {
        title: editing.title!.trim(),
        content: editing.content!.trim(),
        category: editing.category || 'general',
        shortcut: shortcut || null,
        is_active: editing.is_active ?? true,
      };
      if (!editing.id) {
        const { data: auth } = await supabase.auth.getUser();
        payload.created_by = auth.user?.id ?? null;
      }
      const q = editing.id
        ? supabase.from('canned_responses').update(payload).eq('id', editing.id)
        : supabase.from('canned_responses').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Response updated' : 'Response created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this canned response?')) return;
    try {
      const { error } = await supabase.from('canned_responses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (c: Canned) => {
    try {
      const { error } = await supabase.from('canned_responses').update({ is_active: !c.is_active }).eq('id', c.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  const copyToClipboard = async (c: Canned) => {
    try {
      await navigator.clipboard.writeText(c.content);
      toast.success('Copied to clipboard');
    } catch { toast.error('Copy failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><MessageSquare className="h-6 w-6" /> Canned Responses</h2>
          <p className="text-sm text-muted-foreground">Reusable reply templates for support agents with optional `/shortcut` triggers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New response</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total templates</div><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total uses</div><div className="text-2xl font-semibold">{stats.uses}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No responses found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.title}</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="capitalize">{c.category || 'general'}</Badge>
                    {c.shortcut && (
                      <Badge variant="secondary" className="font-mono">
                        <Hash className="h-3 w-3 mr-0.5" />{c.shortcut}
                      </Badge>
                    )}
                    {!!c.usage_count && <Badge variant="outline">{c.usage_count} uses</Badge>}
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <Switch checked={!!c.is_active} onCheckedChange={() => toggleActive(c)} />
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{c.content}</p>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(c)}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(c)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit response' : 'New canned response'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title *</Label>
                <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editing.category || 'general'} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shortcut</Label>
                <Input value={editing.shortcut || ''} onChange={(e) => setEditing({ ...editing, shortcut: e.target.value })} placeholder="e.g. refund-info" />
                <p className="text-xs text-muted-foreground mt-1">Agents type /shortcut to insert.</p>
              </div>
              <div className="sm:col-span-2">
                <Label>Content *</Label>
                <Textarea rows={8} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Hi {{customer_name}}, …" />
                <p className="text-xs text-muted-foreground mt-1">Supports plain text. Use placeholders like {'{{customer_name}}'} that your support UI substitutes.</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive templates are hidden from agent insert menu</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save response'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CannedResponsesManager;
