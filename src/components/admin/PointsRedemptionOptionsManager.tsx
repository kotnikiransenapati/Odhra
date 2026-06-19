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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Gift, Plus, Edit, Trash2, RefreshCw, Coins, History } from 'lucide-react';

type RewardType = 'discount' | 'free_shipping' | 'product' | 'gift_card' | 'cashback' | 'voucher';

type Option = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: any;
  min_tier: string | null;
  is_active: boolean | null;
  usage_limit_per_user: number | null;
  created_at?: string;
};

type Redemption = {
  id: string;
  user_id: string;
  option_id: string | null;
  points_spent: number;
  reward_code: string | null;
  status: string | null;
  created_at: string | null;
  used_at: string | null;
};

const REWARD_TYPES: { value: RewardType; label: string; defaultValue: any }[] = [
  { value: 'discount', label: 'Percentage discount', defaultValue: { type: 'percent', amount: 10 } },
  { value: 'free_shipping', label: 'Free shipping', defaultValue: { duration_days: 7 } },
  { value: 'product', label: 'Free product', defaultValue: { product_id: '' } },
  { value: 'gift_card', label: 'Gift card', defaultValue: { amount: 100, currency: 'INR' } },
  { value: 'cashback', label: 'Cashback to wallet', defaultValue: { amount: 50 } },
  { value: 'voucher', label: 'Voucher code', defaultValue: { code_prefix: 'RWD' } },
];

const blank = (): Partial<Option> => ({
  name: '', description: '', points_cost: 500,
  reward_type: 'discount', reward_value: { type: 'percent', amount: 10 },
  min_tier: null, is_active: true, usage_limit_per_user: null,
});

export function PointsRedemptionOptionsManager() {
  const [rows, setRows] = useState<Option[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editing, setEditing] = useState<Partial<Option> | null>(null);
  const [valueText, setValueText] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'catalog' | 'history'>('catalog');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('points_redemption_options')
        .select('*')
        .order('points_cost', { ascending: true });
      if (error) throw error;
      setRows((data as Option[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load options');
    } finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('points_redemptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRedemptions((data as Redemption[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load history');
    } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active).length,
    avgCost: rows.length ? Math.round(rows.reduce((s, r) => s + (r.points_cost || 0), 0) / rows.length) : 0,
  }), [rows]);

  const startEdit = (o?: Option) => {
    const v = o ? { ...o } : blank();
    setEditing(v);
    setValueText(JSON.stringify(v.reward_value ?? {}, null, 2));
  };

  const onTypeChange = (t: RewardType) => {
    if (!editing) return;
    const preset = REWARD_TYPES.find(r => r.value === t)?.defaultValue ?? {};
    setEditing({ ...editing, reward_type: t });
    setValueText(JSON.stringify(preset, null, 2));
  };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error('Name is required'); return; }
    if (!editing.points_cost || editing.points_cost <= 0) { toast.error('Points cost must be positive'); return; }
    setSaving(true);
    try {
      let parsedValue: any;
      try { parsedValue = valueText ? JSON.parse(valueText) : {}; }
      catch { throw new Error('Reward value must be valid JSON'); }

      const payload = {
        name: editing.name!.trim(),
        description: editing.description?.trim() || null,
        points_cost: Math.floor(editing.points_cost!),
        reward_type: editing.reward_type || 'discount',
        reward_value: parsedValue,
        min_tier: editing.min_tier || null,
        is_active: editing.is_active ?? true,
        usage_limit_per_user: editing.usage_limit_per_user || null,
      };

      const q = editing.id
        ? supabase.from('points_redemption_options').update(payload).eq('id', editing.id)
        : supabase.from('points_redemption_options').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Option updated' : 'Option created');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this redemption option? Existing redemptions will be kept.')) return;
    try {
      const { error } = await supabase.from('points_redemption_options').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (o: Option) => {
    try {
      const { error } = await supabase
        .from('points_redemption_options')
        .update({ is_active: !o.is_active })
        .eq('id', o.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Gift className="h-6 w-6" /> Points Redemption Catalog
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure what customers can unlock by spending loyalty points.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { load(); if (tab === 'history') loadHistory(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => startEdit()}>
            <Plus className="h-4 w-4 mr-1" /> New option
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Total options</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Active</div>
          <div className="text-2xl font-semibold">{stats.active}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Avg point cost</div>
          <div className="text-2xl font-semibold flex items-center gap-1">
            <Coins className="h-5 w-5 text-amber-500" /> {stats.avgCost}
          </div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Recent redemptions</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-3 mt-4">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              No redemption options yet.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((o) => (
                <Card key={o.id}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{o.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="font-mono">
                          <Coins className="h-3 w-3 mr-1 text-amber-500" />
                          {o.points_cost} pts
                        </Badge>
                        <Badge variant="outline">{o.reward_type}</Badge>
                        {o.min_tier && <Badge variant="outline">{o.min_tier}+</Badge>}
                        <Badge variant={o.is_active ? 'default' : 'secondary'}>
                          {o.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Switch checked={!!o.is_active} onCheckedChange={() => toggleActive(o)} />
                  </CardHeader>
                  <CardContent className="pt-2 space-y-2 text-sm">
                    {o.description && <p className="text-muted-foreground line-clamp-2">{o.description}</p>}
                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-24">
{JSON.stringify(o.reward_value, null, 2)}
                    </pre>
                    {o.usage_limit_per_user && (
                      <div className="text-xs text-muted-foreground">
                        Limit: {o.usage_limit_per_user} per customer
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(o)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(o.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Last 100 redemptions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loadingHistory ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)
              ) : redemptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No redemptions yet</p>
              ) : (
                <div className="divide-y">
                  {redemptions.map((r) => (
                    <div key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-mono text-xs truncate">{r.user_id.slice(0, 8)}…</div>
                        <div className="text-xs text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary"><Coins className="h-3 w-3 mr-1 text-amber-500" />{r.points_spent}</Badge>
                        <Badge variant={r.status === 'used' ? 'default' : r.status === 'expired' ? 'destructive' : 'outline'}>
                          {r.status || 'active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit redemption option' : 'New redemption option'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Points cost *</Label>
                <Input type="number" min={1} value={editing.points_cost ?? 0}
                  onChange={(e) => setEditing({ ...editing, points_cost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Usage limit per user</Label>
                <Input type="number" min={0} value={editing.usage_limit_per_user ?? ''}
                  placeholder="Unlimited"
                  onChange={(e) => setEditing({ ...editing, usage_limit_per_user: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Reward type</Label>
                <Select value={editing.reward_type || 'discount'} onValueChange={(v) => onTypeChange(v as RewardType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Minimum tier</Label>
                <Select value={editing.min_tier || '__none__'} onValueChange={(v) => setEditing({ ...editing, min_tier: v === '__none__' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Any tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any tier</SelectItem>
                    <SelectItem value="bronze">Bronze+</SelectItem>
                    <SelectItem value="silver">Silver+</SelectItem>
                    <SelectItem value="gold">Gold+</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Reward value (JSON)</Label>
                <Textarea rows={5} className="font-mono text-xs" value={valueText} onChange={(e) => setValueText(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Shape varies by reward type. Pre-filled with a sensible default.</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive options are hidden from customers</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save option'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PointsRedemptionOptionsManager;
