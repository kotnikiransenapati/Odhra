import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Target, Plus, RefreshCw, Trash2, TrendingUp, Search } from 'lucide-react';

type Goal = {
  id: string;
  vendor_id: string;
  period_month: string;
  target_revenue: number;
  target_orders: number;
  target_rating: number | null;
  bonus_amount: number;
  notes: string | null;
  is_active: boolean;
};

type Progress = {
  goal_id: string | null;
  period_month: string;
  target_revenue: number;
  actual_revenue: number;
  revenue_pct: number;
  target_orders: number;
  actual_orders: number;
  orders_pct: number;
  target_rating: number | null;
  actual_rating: number;
  bonus_amount: number;
  is_achieved: boolean;
};

const monthInput = (d: string | Date) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export function VendorSalesGoalsManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [saving, setSaving] = useState(false);
  const [progressVendor, setProgressVendor] = useState('');
  const [progressMonth, setProgressMonth] = useState(monthInput(new Date()));
  const [progress, setProgress] = useState<Progress | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_vendor_goals_list', { _vendor_id: null });
      if (error) throw error;
      setGoals((data as Goal[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setEditing({
    vendor_id: '', period_month: `${monthInput(new Date())}-01`,
    target_revenue: 0, target_orders: 0, target_rating: null,
    bonus_amount: 0, notes: '', is_active: true,
  });

  const save = async () => {
    if (!editing?.vendor_id || !editing.period_month) {
      toast.error('Vendor ID and period are required'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_vendor_goal_upsert', {
        _id: (editing as Goal).id || null,
        _vendor_id: editing.vendor_id!,
        _period_month: editing.period_month!,
        _target_revenue: editing.target_revenue ?? 0,
        _target_orders: editing.target_orders ?? 0,
        _target_rating: editing.target_rating ?? null,
        _bonus_amount: editing.bonus_amount ?? 0,
        _notes: editing.notes ?? null,
        _is_active: editing.is_active ?? true,
      });
      if (error) throw error;
      toast.success('Goal saved');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      const { error } = await supabase.rpc('admin_vendor_goal_delete', { _id: id });
      if (error) throw error;
      toast.success('Deleted');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const checkProgress = async () => {
    if (!progressVendor.trim()) { toast.error('Vendor ID required'); return; }
    setChecking(true);
    setProgress(null);
    try {
      const { data, error } = await supabase.rpc('vendor_goal_progress', {
        _vendor_id: progressVendor.trim(),
        _month: `${progressMonth}-01`,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] as Progress) : (data as Progress);
      setProgress(row || null);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setChecking(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" /> Vendor Sales Goals
          </h2>
          <p className="text-sm text-muted-foreground">
            Set monthly revenue / order / rating targets with optional achievement bonuses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> New Goal</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Check Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Vendor ID" value={progressVendor} onChange={(e) => setProgressVendor(e.target.value)} className="max-w-xs" />
            <Input type="month" value={progressMonth} onChange={(e) => setProgressMonth(e.target.value)} className="max-w-[180px]" />
            <Button onClick={checkProgress} disabled={checking}>{checking ? '…' : 'Check'}</Button>
          </div>
          {progress && (
            <div className="grid md:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs">Revenue</Label>
                <div className="text-sm">₹{Number(progress.actual_revenue).toLocaleString('en-IN')} / ₹{Number(progress.target_revenue).toLocaleString('en-IN')}</div>
                <Progress value={Math.min(100, Number(progress.revenue_pct))} className="h-2 mt-1" />
                <div className="text-xs text-muted-foreground mt-1">{Number(progress.revenue_pct).toFixed(1)}%</div>
              </div>
              <div>
                <Label className="text-xs">Orders</Label>
                <div className="text-sm">{progress.actual_orders} / {progress.target_orders}</div>
                <Progress value={Math.min(100, Number(progress.orders_pct))} className="h-2 mt-1" />
                <div className="text-xs text-muted-foreground mt-1">{Number(progress.orders_pct).toFixed(1)}%</div>
              </div>
              <div>
                <Label className="text-xs">Rating</Label>
                <div className="text-sm">{Number(progress.actual_rating).toFixed(2)}★ / {progress.target_rating ? `${Number(progress.target_rating).toFixed(2)}★` : '—'}</div>
                <div className="mt-2">
                  <Badge className={progress.is_achieved ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}>
                    {progress.is_achieved ? `Achieved (+₹${Number(progress.bonus_amount).toLocaleString('en-IN')} bonus)` : 'In progress'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : goals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No goals yet</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {goals.map(g => (
            <Card key={g.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline"><TrendingUp className="h-3 w-3 mr-1" />{monthInput(g.period_month)}</Badge>
                    {!g.is_active && <Badge variant="secondary">Inactive</Badge>}
                    <code className="text-xs text-muted-foreground">vendor {g.vendor_id.slice(0, 8)}…</code>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Target: ₹{Number(g.target_revenue).toLocaleString('en-IN')} · {g.target_orders} orders
                    {g.target_rating ? ` · ${Number(g.target_rating).toFixed(1)}★` : ''}
                    {g.bonus_amount > 0 ? ` · Bonus ₹${Number(g.bonus_amount).toLocaleString('en-IN')}` : ''}
                  </div>
                  {g.notes && <p className="text-xs italic text-muted-foreground mt-1">"{g.notes}"</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(g)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => del(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{(editing as Goal)?.id ? 'Edit Goal' : 'New Goal'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Vendor ID</Label>
                <Input value={editing.vendor_id || ''} onChange={(e) => setEditing({ ...editing, vendor_id: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Period (month)</Label>
                  <Input type="month" value={monthInput(editing.period_month || new Date())}
                    onChange={(e) => setEditing({ ...editing, period_month: `${e.target.value}-01` })} /></div>
                <div><Label>Bonus (₹)</Label>
                  <Input type="number" value={editing.bonus_amount ?? 0}
                    onChange={(e) => setEditing({ ...editing, bonus_amount: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Target Revenue (₹)</Label>
                  <Input type="number" value={editing.target_revenue ?? 0}
                    onChange={(e) => setEditing({ ...editing, target_revenue: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Target Orders</Label>
                  <Input type="number" value={editing.target_orders ?? 0}
                    onChange={(e) => setEditing({ ...editing, target_orders: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Target Rating (optional)</Label>
                  <Input type="number" step="0.1" value={editing.target_rating ?? ''}
                    onChange={(e) => setEditing({ ...editing, target_rating: e.target.value ? parseFloat(e.target.value) : null })} /></div>
              </div>
              <div><Label>Notes</Label>
                <textarea className="w-full min-h-[60px] rounded-md border bg-background p-2 text-sm"
                  value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
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

export default VendorSalesGoalsManager;
