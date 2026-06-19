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
import { Bookmark, Plus, Pin, PinOff, Trash2, RefreshCw, Eye, Users, Star } from 'lucide-react';

const SCOPES = [
  { value: 'orders', label: 'Orders' },
  { value: 'customers', label: 'Customers' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'products', label: 'Products' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'support', label: 'Support Tickets' },
  { value: 'analytics', label: 'Analytics' },
];

interface SavedView {
  id: string; admin_id: string; scope: string; name: string;
  description: string | null; filters: any; sort_config: any; columns: any;
  is_shared: boolean; is_default: boolean; pinned: boolean;
  use_count: number; last_used_at: string | null; created_at: string;
}

interface Props {
  scope?: string;
  onApply?: (view: SavedView) => void;
  compact?: boolean;
}

export function AdminSavedViews({ scope: scopeProp, onApply, compact = false }: Props) {
  const [scope, setScope] = useState(scopeProp || 'orders');
  const [rows, setRows] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', filters: '{}', sort: '{}', columns: '[]', is_shared: false,
  });

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id ?? null)); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_saved_views_list' as any, { _scope: scope });
    if (error) toast.error(error.message); else setRows((data as SavedView[]) || []);
    setLoading(false);
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (form.name.trim().length < 2) { toast.error('Name ≥ 2 chars'); return; }
    let filters: any, sort: any, columns: any;
    try {
      filters = JSON.parse(form.filters || '{}');
      sort = JSON.parse(form.sort || '{}');
      columns = JSON.parse(form.columns || '[]');
    } catch { toast.error('Invalid JSON in filters/sort/columns'); return; }
    const { error } = await supabase.rpc('admin_saved_view_save' as any, {
      _scope: scope, _name: form.name.trim(), _filters: filters, _sort: sort, _columns: columns,
      _description: form.description || null, _is_shared: form.is_shared,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('View saved');
    setOpen(false);
    setForm({ name: '', description: '', filters: '{}', sort: '{}', columns: '[]', is_shared: false });
    load();
  };

  const apply = async (v: SavedView) => {
    await supabase.rpc('admin_saved_view_apply' as any, { _id: v.id });
    onApply?.(v);
    if (!onApply) toast.info(`Applied: ${v.name}`);
    load();
  };

  const togglePin = async (id: string) => {
    const { error } = await supabase.rpc('admin_saved_view_toggle_pin' as any, { _id: id });
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this saved view?')) return;
    const { error } = await supabase.rpc('admin_saved_view_delete' as any, { _id: id });
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="w-6 h-6" /> Saved Views</h2>
            <p className="text-sm text-muted-foreground">Reusable filter + sort + column presets per admin scope</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {!scopeProp && (
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New View</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Save View for {SCOPES.find(s => s.value === scope)?.label}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="High value pending orders" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Filters (JSON)</Label><Textarea rows={3} className="font-mono text-xs" value={form.filters} onChange={e => setForm({ ...form, filters: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sort (JSON)</Label><Textarea rows={2} className="font-mono text-xs" value={form.sort} onChange={e => setForm({ ...form, sort: e.target.value })} /></div>
                <div><Label>Columns (JSON)</Label><Textarea rows={2} className="font-mono text-xs" value={form.columns} onChange={e => setForm({ ...form, columns: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div><Label className="cursor-pointer">Share with team</Label><p className="text-xs text-muted-foreground">Other admins can use this view</p></div>
                <Switch checked={form.is_shared} onCheckedChange={v => setForm({ ...form, is_shared: v })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Save View</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{SCOPES.find(s => s.value === scope)?.label} Views</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           rows.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No saved views yet.</div> :
           <div className="space-y-2">
            {rows.map(v => {
              const isOwn = v.admin_id === currentUser;
              return (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.pinned && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                      <span className="font-medium">{v.name}</span>
                      {v.is_shared && <Badge variant="secondary" className="text-[10px]"><Users className="w-3 h-3 mr-1" />Shared</Badge>}
                      {!isOwn && <Badge variant="outline" className="text-[10px]">Team</Badge>}
                    </div>
                    {v.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{v.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">Used {v.use_count}× {v.last_used_at && `· last ${new Date(v.last_used_at).toLocaleDateString()}`}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => apply(v)}><Eye className="w-4 h-4" /></Button>
                    {isOwn && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => togglePin(v.id)}>
                          {v.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
