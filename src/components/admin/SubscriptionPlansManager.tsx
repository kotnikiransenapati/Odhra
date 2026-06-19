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
import { Repeat, Plus, Edit, Trash2, RefreshCw, Package } from 'lucide-react';

type Plan = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  interval: string;
  interval_count: number;
  price: number;
  discount_percentage: number | null;
  is_active: boolean;
};
type ProductLite = { id: string; title: string };

const blank = (): Partial<Plan> => ({
  product_id: '', name: '', description: '',
  interval: 'month', interval_count: 1,
  price: 0, discount_percentage: 10, is_active: true,
});

export function SubscriptionPlansManager() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: plans, error: pe }, { data: prods }] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('id,title').eq('is_active', true).order('title').limit(500),
      ]);
      if (pe) throw pe;
      setRows((plans as Plan[]) || []);
      setProducts((prods as ProductLite[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p.title])), [products]);
  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (productMap[r.product_id] || '').toLowerCase().includes(q)
    );
  }, [rows, filter, productMap]);

  const startEdit = (p?: Plan) => setEditing(p ? { ...p } : blank());

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error('Name required');
    if (!editing.product_id) return toast.error('Product required');
    if (!editing.price || editing.price <= 0) return toast.error('Price must be positive');
    if (!editing.interval_count || editing.interval_count < 1) return toast.error('Interval count must be ≥ 1');

    setSaving(true);
    try {
      const payload = {
        product_id: editing.product_id,
        name: editing.name!.trim(),
        description: editing.description?.trim() || null,
        interval: editing.interval || 'month',
        interval_count: Math.floor(editing.interval_count),
        price: Number(editing.price),
        discount_percentage: editing.discount_percentage != null ? Number(editing.discount_percentage) : 0,
        is_active: editing.is_active ?? true,
      };
      const q = editing.id
        ? supabase.from('subscription_plans').update(payload).eq('id', editing.id)
        : supabase.from('subscription_plans').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Plan updated' : 'Plan created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this subscription plan? Active subscribers may be affected.')) return;
    try {
      const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (p: Plan) => {
    try {
      const { error } = await supabase.from('subscription_plans').update({ is_active: !p.is_active }).eq('id', p.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><Repeat className="h-6 w-6" /> Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">Recurring delivery plans per product with custom intervals and discounts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New plan</Button>
        </div>
      </div>

      <Input placeholder="Search plans or products…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-md" />

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No subscription plans found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(p => (
            <Card key={p.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{p.name}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                    <Package className="h-3 w-3" /> {productMap[p.product_id] || p.product_id.slice(0, 8)}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary">Every {p.interval_count} {p.interval}{p.interval_count > 1 ? 's' : ''}</Badge>
                    <Badge variant="outline">₹{Number(p.price).toFixed(2)}</Badge>
                    {p.discount_percentage ? <Badge>−{p.discount_percentage}%</Badge> : null}
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </CardHeader>
              <CardContent className="pt-2">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(p)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit plan' : 'New subscription plan'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Product *</Label>
                <Select value={editing.product_id || ''} onValueChange={(v) => setEditing({ ...editing, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Plan name *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Interval</Label>
                <Select value={editing.interval || 'month'} onValueChange={(v) => setEditing({ ...editing, interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Every N intervals</Label>
                <Input type="number" min={1} value={editing.interval_count ?? 1} onChange={(e) => setEditing({ ...editing, interval_count: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Price (₹) *</Label>
                <Input type="number" min={0} step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Subscriber discount (%)</Label>
                <Input type="number" min={0} max={100} step="0.1" value={editing.discount_percentage ?? 0} onChange={(e) => setEditing({ ...editing, discount_percentage: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive plans are hidden from product pages</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionPlansManager;
