import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus, Edit, Trash2, RefreshCw, TrendingUp, ExternalLink } from 'lucide-react';

type Redirect = {
  id: string;
  source_path: string;
  target_path: string;
  redirect_type: number;
  is_active: boolean;
  hit_count: number;
  created_at?: string;
  updated_at?: string;
};

const TYPES = [
  { v: 301, l: '301 — Permanent' },
  { v: 302, l: '302 — Temporary' },
  { v: 307, l: '307 — Temporary (preserve method)' },
  { v: 308, l: '308 — Permanent (preserve method)' },
];

const normalize = (p: string) => {
  let s = (p || '').trim();
  if (!s) return s;
  if (!/^https?:\/\//i.test(s) && !s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.replace(/\/+$/, '');
  return s;
};

const blank = (): Partial<Redirect> => ({
  source_path: '', target_path: '', redirect_type: 301, is_active: true,
});

export function UrlRedirectsManager() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Redirect> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('url_redirects')
        .select('*')
        .order('hit_count', { ascending: false });
      if (error) throw error;
      setRows((data as Redirect[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (statusFilter === 'active' && !r.is_active) return false;
      if (statusFilter === 'inactive' && r.is_active) return false;
      if (!q) return true;
      return r.source_path.toLowerCase().includes(q) || r.target_path.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active).length,
    hits: rows.reduce((s, r) => s + (r.hit_count || 0), 0),
  }), [rows]);

  const startEdit = (r?: Redirect) => setEditing(r ? { ...r } : blank());

  const save = async () => {
    const source = normalize(editing?.source_path || '');
    const target = normalize(editing?.target_path || '');
    if (!source) return toast.error('Source path required');
    if (!target) return toast.error('Target path required');
    if (source === target) return toast.error('Source and target cannot be identical');
    if (!/^https?:\/\//i.test(source) && !source.startsWith('/')) {
      return toast.error('Source must start with / or be a full URL');
    }
    setSaving(true);
    try {
      const payload: any = {
        source_path: source,
        target_path: target,
        redirect_type: Number(editing?.redirect_type ?? 301),
        is_active: editing?.is_active ?? true,
      };
      if (!editing?.id) {
        const { data: auth } = await supabase.auth.getUser();
        payload.created_by = auth.user?.id ?? null;
      }
      const q = editing?.id
        ? supabase.from('url_redirects').update(payload).eq('id', editing.id)
        : supabase.from('url_redirects').insert(payload);
      const { error } = await q;
      if (error) {
        if (String(error.message).toLowerCase().includes('duplicate')) {
          throw new Error('A redirect for that source path already exists');
        }
        throw error;
      }
      toast.success(editing?.id ? 'Redirect updated' : 'Redirect created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this redirect?')) return;
    try {
      const { error } = await supabase.from('url_redirects').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (r: Redirect) => {
    try {
      const { error } = await supabase.from('url_redirects').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> URL Redirects</h2>
          <p className="text-sm text-muted-foreground">SEO-safe 301/302 redirect map. Hits are tracked when a redirect fires.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New redirect</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total hits</div><div className="text-2xl font-semibold flex items-center gap-1"><TrendingUp className="h-5 w-5 text-muted-foreground" />{stats.hits}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search source or target…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No redirects found.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-mono break-all flex items-center gap-2 flex-wrap">
                    <span>{r.source_path}</span>
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{r.target_path}</span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline">{r.redirect_type}</Badge>
                    <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" />{r.hit_count} hits</Badge>
                    <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 flex-wrap">
                  {r.source_path.startsWith('/') && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={r.source_path} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Test</a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => startEdit(r)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit redirect' : 'New redirect'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Source path *</Label>
                <Input value={editing.source_path || ''} onChange={(e) => setEditing({ ...editing, source_path: e.target.value })} placeholder="/old-page" />
                <p className="text-xs text-muted-foreground mt-1">Path on this site, e.g. <code>/old-page</code></p>
              </div>
              <div>
                <Label>Target path or URL *</Label>
                <Input value={editing.target_path || ''} onChange={(e) => setEditing({ ...editing, target_path: e.target.value })} placeholder="/new-page or https://…" />
              </div>
              <div>
                <Label>Redirect type</Label>
                <Select value={String(editing.redirect_type ?? 301)} onValueChange={(v) => setEditing({ ...editing, redirect_type: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.v} value={String(t.v)}>{t.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Disable to keep the rule without firing it</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save redirect'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UrlRedirectsManager;
