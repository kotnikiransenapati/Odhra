import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Plus, RefreshCw, Edit, Trash2, Copy, TrendingUp } from 'lucide-react';

const CATEGORIES = ['internal','customer','shipping','refund','fraud'] as const;
type Category = typeof CATEGORIES[number];

interface Template {
  id: string; title: string; body: string; category: Category;
  variables: string[]; is_shared: boolean; use_count: number; last_used_at: string | null;
  created_by: string | null; created_at: string;
}

interface Props {
  embedded?: boolean;
  onPick?: (rendered: string, template: Template) => void;
  contextVars?: Record<string, string>;
}

const emptyForm = { title: '', body: '', category: 'internal' as Category, variables: '', is_shared: true };

export function OrderNoteTemplates({ embedded = false, onPick, contextVars = {} }: Props) {
  const [rows, setRows] = useState<Template[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id ?? null)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from('order_note_templates' as any).select('*').order('use_count', { ascending: false }),
      embedded ? Promise.resolve({ data: null, error: null }) : supabase.rpc('admin_order_note_templates_stats' as any),
    ]);
    if (r.error) toast.error(r.error.message); else setRows((r.data as any as Template[]) || []);
    if (!embedded && !s.error) setStats(s.data);
    setLoading(false);
  }, [embedded]);

  useEffect(() => { load(); }, [load]);

  const render = (body: string) =>
    Object.entries(contextVars).reduce((acc, [k, v]) => acc.split(`{{${k}}}`).join(v ?? ''), body);

  const save = async () => {
    if (form.title.trim().length < 2 || form.body.trim().length < 3) {
      toast.error('Title ≥ 2 and body ≥ 3 chars'); return;
    }
    const payload: any = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      variables: form.variables.split(',').map(s => s.trim()).filter(Boolean),
      is_shared: form.is_shared,
    };
    if (editing) {
      const { error } = await supabase.from('order_note_templates' as any).update(payload).eq('id', editing);
      if (error) { toast.error(error.message); return; }
      toast.success('Updated');
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('order_note_templates' as any).insert({ ...payload, created_by: u.user?.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Created');
    }
    setOpen(false); setEditing(null); setForm(emptyForm);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete template?')) return;
    const { error } = await supabase.from('order_note_templates' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const use = async (t: Template) => {
    await supabase.rpc('admin_order_note_template_use' as any, { _id: t.id });
    const text = render(t.body);
    if (onPick) {
      onPick(text, t);
    } else {
      navigator.clipboard?.writeText(text);
      toast.success('Copied to clipboard');
    }
    load();
  };

  const startEdit = (t: Template) => {
    setEditing(t.id);
    setForm({ title: t.title, body: t.body, category: t.category, variables: (t.variables || []).join(', '), is_shared: t.is_shared });
    setOpen(true);
  };

  const filtered = rows.filter(t =>
    (filter === 'all' || t.category === filter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> Order Note Templates</h2>
            <p className="text-sm text-muted-foreground">Reusable canned notes for the order workflow</p>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      )}

      {!embedded && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Templates</div><div className="text-2xl font-bold">{stats.total ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Uses</div><div className="text-2xl font-bold">{stats.total_uses ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Shared</div><div className="text-2xl font-bold">{stats.shared ?? 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Categories</div><div className="text-2xl font-bold">{Object.keys(stats.by_category || {}).length}</div></CardContent></Card>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Template</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Body (use {`{{variable}}`} placeholders)</Label>
                <Textarea rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Hi {{customer_name}}, your order {{order_number}} has shipped." />
              </div>
              <div><Label>Variables (comma separated)</Label>
                <Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="customer_name, order_number" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><Label className="cursor-pointer">Share with team</Label><p className="text-xs text-muted-foreground">All admins can use this template</p></div>
                <Switch checked={form.is_shared} onCheckedChange={v => setForm({ ...form, is_shared: v })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           filtered.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No templates.</div> :
           <div className="space-y-2">
            {filtered.map(t => {
              const isOwn = t.created_by === currentUser;
              return (
                <div key={t.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t.title}</span>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      {t.is_shared && <Badge variant="secondary" className="text-[10px]">Shared</Badge>}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{t.use_count}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">{t.body}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => use(t)}><Copy className="w-4 h-4 mr-1" />{onPick ? 'Insert' : 'Copy'}</Button>
                    {isOwn && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
