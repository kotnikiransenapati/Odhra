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
import { Award, Plus, Edit, RefreshCw, Sparkles } from 'lucide-react';

type Tier = {
  id: string;
  name: string;
  rank: number;
  commission_percent: number;
  min_monthly_revenue: number;
  min_rating: number;
  min_on_time_percent: number;
  max_cancellation_percent: number;
  perks: string[] | unknown;
  badge_color: string | null;
  is_active: boolean;
};

const blankTier = (): Partial<Tier> => ({
  name: '', rank: 1, commission_percent: 15,
  min_monthly_revenue: 0, min_rating: 0,
  min_on_time_percent: 0, max_cancellation_percent: 100,
  badge_color: '#94a3b8', is_active: true, perks: [],
});

export function CommissionTierManager() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tier> | null>(null);
  const [perksText, setPerksText] = useState('');
  const [vendorIdForRecalc, setVendorIdForRecalc] = useState('');
  const [recalcing, setRecalcing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_commission_tiers_list');
      if (error) throw error;
      setTiers((data as Tier[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (t?: Tier) => {
    if (t) {
      setEditing(t);
      setPerksText(Array.isArray(t.perks) ? (t.perks as string[]).join('\n') : '');
    } else {
      setEditing(blankTier());
      setPerksText('');
    }
  };

  const save = async () => {
    if (!editing?.name || (editing.commission_percent ?? -1) < 0) {
      toast.error('Name and commission percent are required');
      return;
    }
    setSaving(true);
    try {
      const perks = perksText.split('\n').map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.rpc('admin_commission_tier_upsert', {
        _id: (editing as Tier).id || null,
        _name: editing.name!,
        _rank: editing.rank ?? 1,
        _commission_percent: editing.commission_percent ?? 15,
        _min_monthly_revenue: editing.min_monthly_revenue ?? 0,
        _min_rating: editing.min_rating ?? 0,
        _min_on_time_percent: editing.min_on_time_percent ?? 0,
        _max_cancellation_percent: editing.max_cancellation_percent ?? 100,
        _badge_color: editing.badge_color || null,
        _perks: perks,
        _is_active: editing.is_active ?? true,
      });
      if (error) throw error;
      toast.success('Tier saved');
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const recalc = async () => {
    if (!vendorIdForRecalc.trim()) {
      toast.error('Enter a vendor ID');
      return;
    }
    setRecalcing(true);
    try {
      const { data, error } = await supabase.rpc('recalc_vendor_commission_tier', {
        _vendor_id: vendorIdForRecalc.trim(),
      });
      if (error) throw error;
      const tier = tiers.find(t => t.id === data);
      toast.success(`Vendor assigned to ${tier?.name || 'tier'}`);
      setVendorIdForRecalc('');
    } catch (e: any) {
      toast.error(e.message || 'Recalc failed');
    } finally {
      setRecalcing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6" /> Vendor Commission Tiers
          </h2>
          <p className="text-sm text-muted-foreground">
            Performance-based commission rates. Lower commission = stronger performance.
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Recalculate Vendor Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input
              value={vendorIdForRecalc}
              onChange={(e) => setVendorIdForRecalc(e.target.value)}
              placeholder="Vendor ID"
              className="max-w-md"
            />
            <Button onClick={recalc} disabled={recalcing}>
              {recalcing ? 'Computing…' : 'Recalculate'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Evaluates 30-day revenue, rating, on-time delivery, and cancellation rate.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tiers.map(t => (
            <Card key={t.id} className="relative overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: t.badge_color || 'hsl(var(--primary))' }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.badge_color || '#888' }}
                      />
                      {t.name}
                      {!t.is_active && <Badge variant="outline">Inactive</Badge>}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">Rank {t.rank}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{Number(t.commission_percent).toFixed(2)}%</div>
                    <div className="text-xs text-muted-foreground">commission</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Min revenue/mo: <span className="font-medium">₹{Number(t.min_monthly_revenue).toLocaleString('en-IN')}</span></div>
                  <div>Min rating: <span className="font-medium">{Number(t.min_rating).toFixed(1)}★</span></div>
                  <div>On-time ≥ <span className="font-medium">{Number(t.min_on_time_percent).toFixed(0)}%</span></div>
                  <div>Cancels ≤ <span className="font-medium">{Number(t.max_cancellation_percent).toFixed(0)}%</span></div>
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
            <DialogTitle>{(editing as Tier)?.id ? 'Edit Tier' : 'New Tier'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>Rank</Label>
                  <Input type="number" value={editing.rank ?? 1}
                    onChange={(e) => setEditing({ ...editing, rank: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Commission %</Label>
                  <Input type="number" step="0.01" value={editing.commission_percent ?? 0}
                    onChange={(e) => setEditing({ ...editing, commission_percent: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Badge Color</Label>
                  <Input type="color" value={editing.badge_color || '#888888'}
                    onChange={(e) => setEditing({ ...editing, badge_color: e.target.value })} />
                </div>
                <div>
                  <Label>Min Revenue (₹/mo)</Label>
                  <Input type="number" value={editing.min_monthly_revenue ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_monthly_revenue: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Min Rating</Label>
                  <Input type="number" step="0.1" value={editing.min_rating ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_rating: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Min On-Time %</Label>
                  <Input type="number" step="0.1" value={editing.min_on_time_percent ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_on_time_percent: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Max Cancellation %</Label>
                  <Input type="number" step="0.1" value={editing.max_cancellation_percent ?? 100}
                    onChange={(e) => setEditing({ ...editing, max_cancellation_percent: parseFloat(e.target.value) || 100 })} />
                </div>
              </div>
              <div>
                <Label>Perks (one per line)</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border bg-background p-2 text-sm"
                  value={perksText}
                  onChange={(e) => setPerksText(e.target.value)}
                  placeholder="Priority support&#10;Featured listings"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Tier'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommissionTierManager;
