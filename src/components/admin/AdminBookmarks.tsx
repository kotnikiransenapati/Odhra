import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bookmark, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

interface Row { id: string; label: string; path: string; icon: string | null; sort_order: number; }

export function AdminBookmarks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', path: '', icon: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_my_admin_bookmarks' as any);
    if (error) toast.error(error.message); else setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.label.trim() || !form.path.trim()) { toast.error('Label and path required'); return; }
    const { error } = await supabase.rpc('upsert_my_admin_bookmark' as any, {
      _label: form.label.trim(), _path: form.path.trim(), _icon: form.icon || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Bookmark added');
    setOpen(false); setForm({ label: '', path: '', icon: '' });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.rpc('delete_my_admin_bookmark' as any, { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success('Removed');
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next);
    const { error } = await supabase.rpc('reorder_my_admin_bookmarks' as any, { _ids: next.map(r => r.id) });
    if (error) { toast.error(error.message); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="w-6 h-6" /> My Admin Bookmarks</h2>
          <p className="text-sm text-muted-foreground">Pin admin pages you visit often for one-click access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Bookmark</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Bookmark</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Pending KYC" /></div>
              <div><Label>Path</Label><Input value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} placeholder="/admin?tab=kyc-queue" /></div>
              <div><Label>Icon (optional)</Label><Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="lucide name" /></div>
              <Button onClick={add} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bookmarks ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No bookmarks yet. Add one above.</p> : (
            <ul className="divide-y">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.label}</div>
                    <a href={r.path} className="text-xs text-muted-foreground font-mono hover:text-primary flex items-center gap-1 truncate">
                      <ExternalLink className="w-3 h-3" />{r.path}
                    </a>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
