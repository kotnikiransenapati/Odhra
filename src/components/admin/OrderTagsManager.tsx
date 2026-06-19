import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tag, Plus, RefreshCw, Trash2, X } from 'lucide-react';

const COLORS = ['default','secondary','destructive','outline'] as const;
type Color = typeof COLORS[number];

interface OrderTag {
  id: string; label: string; color: Color; description: string | null;
  is_system: boolean; usage_count: number;
}

interface Props {
  orderId?: string;
  embedded?: boolean;
}

export function OrderTagsManager({ orderId, embedded = false }: Props) {
  const [tags, setTags] = useState<OrderTag[]>([]);
  const [assigned, setAssigned] = useState<{ id: string; label: string; color: Color }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', color: 'default' as Color, description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const promises: any[] = [supabase.rpc('admin_order_tags_list' as any)];
    if (orderId) promises.push(supabase.rpc('admin_order_tags_for' as any, { _order_id: orderId }));
    const [list, forOrder] = await Promise.all(promises);
    if (list.error) toast.error(list.error.message); else setTags((list.data as OrderTag[]) || []);
    if (orderId && forOrder && !forOrder.error) setAssigned((forOrder.data as any[]) || []);
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (form.label.trim().length < 2) { toast.error('Label ≥ 2 chars'); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('order_tags' as any).insert({
      label: form.label.trim(), color: form.color,
      description: form.description.trim() || null, created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Tag created');
    setOpen(false); setForm({ label: '', color: 'default', description: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this tag (and all assignments)?')) return;
    const { error } = await supabase.from('order_tags' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggleAssign = async (tagId: string) => {
    if (!orderId) return;
    const isAssigned = assigned.some(a => a.id === tagId);
    const rpc = isAssigned ? 'admin_order_tag_remove' : 'admin_order_tag_assign';
    const { error } = await supabase.rpc(rpc as any, { _order_id: orderId, _tag_id: tagId });
    if (error) { toast.error(error.message); return; }
    load();
  };

  // Embedded picker mode for a specific order
  if (embedded && orderId) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" /> Order Tags</CardTitle></CardHeader>
        <CardContent>
          {assigned.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {assigned.map(a => (
                <Badge key={a.id} variant={a.color}>
                  {a.label}
                  <button onClick={() => toggleAssign(a.id)} className="ml-1.5 -mr-1 opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {tags.filter(t => !assigned.some(a => a.id === t.id)).map(t => (
              <button key={t.id} onClick={() => toggleAssign(t.id)}>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  <Plus className="w-3 h-3 mr-1" />{t.label}
                </Badge>
              </button>
            ))}
            {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags created yet.</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6" /> Order Tags</h2>
          <p className="text-sm text-muted-foreground">Reusable labels for order triage and workflow categorization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Tag</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Order Tag</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="VIP, Escalation, COD Risk…" /></div>
                <div><Label>Color</Label>
                  <Select value={form.color} onValueChange={v => setForm({ ...form, color: v as Color })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Tag Registry ({tags.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           tags.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No tags yet.</div> :
           <div className="space-y-2">
            {tags.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30 transition">
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <Badge variant={t.color}>{t.label}</Badge>
                  {t.description && <span className="text-sm text-muted-foreground truncate">{t.description}</span>}
                  {t.is_system && <Badge variant="outline" className="text-[10px]">system</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{t.usage_count} uses</span>
                  {!t.is_system && <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
