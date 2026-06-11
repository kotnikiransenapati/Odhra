import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tags, Plus, Trash2, RefreshCw } from 'lucide-react';

const COLORS = ['default', 'secondary', 'destructive', 'outline'] as const;

interface Tag { id: string; label: string; color: string; description: string | null; usage_count: number; }

export function CustomerTagsManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', color: 'default' as typeof COLORS[number], description: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_customer_tags_list' as any);
    if (error) toast.error(error.message); else setTags((data as Tag[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (form.label.trim().length < 2) { toast.error('Label ≥ 2 chars'); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('customer_tags' as any).insert({
      label: form.label.trim(), color: form.color,
      description: form.description.trim() || null, created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Tag created');
    setOpen(false); setForm({ label: '', color: 'default', description: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete tag and all its assignments?')) return;
    const { error } = await supabase.from('customer_tags' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Tags className="w-6 h-6" /> Customer Tags</h2>
          <p className="text-sm text-muted-foreground">Lightweight labels admins can apply to customer profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Tag</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Customer Tag</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. VIP, Repeat Returner" maxLength={40} /></div>
                <div>
                  <Label>Color</Label>
                  <Select value={form.color} onValueChange={(v: any) => setForm({ ...form, color: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description (optional)</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={300} /></div>
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Tags ({tags.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           tags.length === 0 ? <p className="text-sm text-muted-foreground">No tags defined yet.</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <Badge variant={t.color as any}>{t.label}</Badge>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      <p className="text-[10px] text-muted-foreground">{t.usage_count} customer{t.usage_count === 1 ? '' : 's'}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Embeddable per-customer tag picker ----
interface PickerProps { customerId: string; }
export function CustomerTagPicker({ customerId }: PickerProps) {
  const [all, setAll] = useState<Tag[]>([]);
  const [applied, setApplied] = useState<{ assignment_id: string; tag_id: string; label: string; color: string }[]>([]);
  const [selected, setSelected] = useState<string>('');

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.rpc('admin_customer_tags_list' as any),
      supabase.rpc('admin_customer_tags_for' as any, { _customer_id: customerId }),
    ]);
    if (!a.error) setAll((a.data as Tag[]) || []);
    if (!b.error) setApplied((b.data as any[]) || []);
  };
  useEffect(() => { if (customerId) load(); /* eslint-disable-next-line */ }, [customerId]);

  const assign = async () => {
    if (!selected) return;
    const { error } = await supabase.rpc('admin_customer_tag_assign' as any, { _customer_id: customerId, _tag_id: selected });
    if (error) { toast.error(error.message); return; }
    setSelected(''); load();
  };
  const unassign = async (id: string) => {
    const { error } = await supabase.rpc('admin_customer_tag_remove' as any, { _assignment_id: id });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const available = all.filter(t => !applied.some(a => a.tag_id === t.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {applied.length === 0 && <span className="text-xs text-muted-foreground">No tags applied</span>}
        {applied.map(a => (
          <Badge key={a.assignment_id} variant={a.color as any} className="gap-1">
            {a.label}
            <button onClick={() => unassign(a.assignment_id)} className="ml-1 opacity-70 hover:opacity-100">×</button>
          </Badge>
        ))}
      </div>
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Add tag…" /></SelectTrigger>
            <SelectContent>{available.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={assign} disabled={!selected}>Apply</Button>
        </div>
      )}
    </div>
  );
}
