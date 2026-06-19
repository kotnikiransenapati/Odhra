import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Crown, Plus, Edit, RefreshCw, UserCog } from 'lucide-react';

type CTier = {
  id: string;
  name: string;
  rank: number;
  point_multiplier: number;
  min_lifetime_spend: number;
  min_orders_12mo: number;
  free_shipping_threshold: number | null;
  birthday_bonus_points: number;
  perks: unknown;
  badge_color: string | null;
  is_active: boolean;
};

const blank = (): Partial<CTier> => ({
  name: '', rank: 1, point_multiplier: 1,
  min_lifetime_spend: 0, min_orders_12mo: 0,
  free_shipping_threshold: null, birthday_bonus_points: 0,
  badge_color: '#94a3b8', is_active: true, perks: [],
});

export function CustomerLoyaltyTiersManager() {
  const [tiers, setTiers] = useState<CTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CTier> | null>(null);
  const [perksText, setPerksText] = useState('');
  const [saving, setSaving] = useState(false);
  const [recalcUser, setRecalcUser] = useState('');
  const [recalcing, setRecalcing] = useState(false);
  const [assignUser, setAssignUser] = useState('');
  const [assignTier, setAssignTier] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_customer_tiers_list');
      if (error) throw error;
      setTiers((data as CTier[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (t?: CTier) => {
    if (t) {
      setEditing(t);
      setPerksText(Array.isArray(t.perks) ? (t.perks as string[]).join('\n') : '');
    } else {
      setEditing(blank());
      setPerksText('');
    }
  };

  const save = async () => {
    if (!editing?.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const perks = perksText.split('\n').map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.rpc('admin_customer_tier_upsert', {
        _id: (editing as CTier).id || null,
        _name: editing.name!,
        _rank: editing.rank ?? 1,
        _point_multiplier: editing.point_multiplier ?? 1,
        _min_lifetime_spend: editing.min_lifetime_spend ?? 0,
        _min_orders_12mo: editing.min_orders_12mo ?? 0,
        _free_shipping_threshold: editing.free_shipping_threshold ?? null,
        _birthday_bonus_points: editing.birthday_bonus_points ?? 0,
        _badge_color: editing.badge_color || null,
        _perks: perks,
        _is_active: editing.is_active ?? true,
      });
      if (error) throw error;
      toast.success('Tier saved');
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setSaving(false); }
  };

  const recalc = async () => {
    if (!recalcUser.trim()) return;
    setRecalcing(true);
    try {
      const { data, error } = await supabase.rpc('recalc_customer_tier', { _user_id: recalcUser.trim() });
      if (error) throw error;
      const t = tiers.find(x => x.id === data);
      toast.success(`Assigned: ${t?.name || 'tier'}`);
      setRecalcUser('');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setRecalcing(false); }
  };

  const manualAssign = async () => {
    if (!assignUser.trim() || !assignTier) { toast.error('User ID and tier required'); return; }
    try {
      const { error } = await supabase.rpc('admin_assign_customer_tier', {
        _user_id: assignUser.trim(), _tier_id: assignTier, _reason: 'manual',
      });
      if (error) throw error;
      toast.success('Tier assigned');
      setAssignUser(''); setAssignTier('');
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6" /> Customer Loyalty Tiers
          </h2>
          <p className="text-sm text-muted-foreground">
            Tiered point multipliers and perks based on lifetime spend & order frequency.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => openEdit()} className="gap-1">
            <Plus className="h-4 w-4" /> New Tier
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Recalculate Customer Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input value={recalcUser} onChange={(e) => setRecalcUser(e.target.value)} placeholder="User ID" />
            <Button onClick={recalc} disabled={recalcing}>{recalcing ? '…' : 'Recalculate'}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Manual Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input value={assignUser} onChange={(e) => setAssignUser(e.target.value)} placeholder="User ID" />
            <select
              className="rounded-md border bg-background px-2 text-sm"
              value={assignTier}
              onChange={(e) => setAssignTier(e.target.value)}
            >
              <option value="">Select tier…</option>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button onClick={manualAssign}>Assign</Button>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tiers.map(t => (
            <Card key={t.id} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: t.badge_color || 'hsl(var(--primary))' }} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: t.badge_color || '#888' }} />
                      {t.name}
                      {!t.is_active && <Badge variant="outline">Inactive</Badge>}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">Rank {t.rank}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{Number(t.point_multiplier).toFixed(2)}×</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>Lifetime ≥ <span className="font-medium">₹{Number(t.min_lifetime_spend).toLocaleString('en-IN')}</span></div>
                  <div>Orders/yr ≥ <span className="font-medium">{t.min_orders_12mo}</span></div>
                  <div>Free ship ≥ <span className="font-medium">{t.free_shipping_threshold ? `₹${Number(t.free_shipping_threshold).toLocaleString('en-IN')}` : '—'}</span></div>
                  <div>Birthday: <span className="font-medium">+{t.birthday_bonus_points} pts</span></div>
                </div>
                {Array.isArray(t.perks) && (t.perks as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(t.perks as string[]).map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="gap-1 mt-2">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{(editing as CTier)?.id ? 'Edit Tier' : 'New Tier'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label>
                  <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Rank</Label>
                  <Input type="number" value={editing.rank ?? 1} onChange={(e) => setEditing({ ...editing, rank: parseInt(e.target.value) || 1 })} /></div>
                <div><Label>Point Multiplier</Label>
                  <Input type="number" step="0.01" value={editing.point_multiplier ?? 1}
                    onChange={(e) => setEditing({ ...editing, point_multiplier: parseFloat(e.target.value) || 1 })} /></div>
                <div><Label>Badge Color</Label>
                  <Input type="color" value={editing.badge_color || '#888888'}
                    onChange={(e) => setEditing({ ...editing, badge_color: e.target.value })} /></div>
                <div><Label>Min Lifetime Spend (₹)</Label>
                  <Input type="number" value={editing.min_lifetime_spend ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_lifetime_spend: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Min Orders / 12mo</Label>
                  <Input type="number" value={editing.min_orders_12mo ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_orders_12mo: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Free Ship Threshold (₹)</Label>
                  <Input type="number" value={editing.free_shipping_threshold ?? ''}
                    onChange={(e) => setEditing({ ...editing, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null })} /></div>
                <div><Label>Birthday Bonus Pts</Label>
                  <Input type="number" value={editing.birthday_bonus_points ?? 0}
                    onChange={(e) => setEditing({ ...editing, birthday_bonus_points: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div>
                <Label>Perks (one per line)</Label>
                <textarea className="w-full min-h-[80px] rounded-md border bg-background p-2 text-sm"
                  value={perksText} onChange={(e) => setPerksText(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerLoyaltyTiersManager;
