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
import { Trophy, Plus, Edit, Trash2, RefreshCw, Calendar, Coins } from 'lucide-react';

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  criteria: any;
  points_reward: number;
  bonus_reward: any;
  starts_at: string;
  ends_at: string;
  max_completions: number | null;
  is_active: boolean;
};

const CHALLENGE_TYPES = [
  { value: 'order_count', label: 'Place N orders', defaultCriteria: { target: 3 } },
  { value: 'spend_amount', label: 'Spend ₹X total', defaultCriteria: { target_amount: 5000 } },
  { value: 'category_purchase', label: 'Buy from category', defaultCriteria: { category_id: '', target: 1 } },
  { value: 'review_count', label: 'Write N reviews', defaultCriteria: { target: 5 } },
  { value: 'referral_count', label: 'Refer N friends', defaultCriteria: { target: 3 } },
  { value: 'streak_days', label: 'Daily visit streak', defaultCriteria: { days: 7 } },
  { value: 'product_purchase', label: 'Buy specific product', defaultCriteria: { product_id: '' } },
];

const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const blank = (): Partial<Challenge> => {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  return {
    title: '', description: '',
    challenge_type: 'order_count',
    criteria: { target: 3 },
    points_reward: 100, bonus_reward: {},
    starts_at: now.toISOString(),
    ends_at: in30.toISOString(),
    max_completions: 1, is_active: true,
  };
};

export function LoyaltyChallengesManager() {
  const [rows, setRows] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Challenge> | null>(null);
  const [criteriaText, setCriteriaText] = useState('');
  const [bonusText, setBonusText] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_challenges')
        .select('*')
        .order('starts_at', { ascending: false });
      if (error) throw error;
      setRows((data as Challenge[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const filtered = useMemo(() => rows.filter(r => {
    const s = new Date(r.starts_at).getTime();
    const e = new Date(r.ends_at).getTime();
    if (filter === 'active') return r.is_active && s <= now && e > now;
    if (filter === 'upcoming') return s > now;
    if (filter === 'expired') return e <= now;
    return true;
  }), [rows, filter, now]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active && new Date(r.starts_at) <= new Date() && new Date(r.ends_at) > new Date()).length,
    upcoming: rows.filter(r => new Date(r.starts_at) > new Date()).length,
  }), [rows]);

  const startEdit = (c?: Challenge) => {
    const v = c ? { ...c } : blank();
    setEditing(v);
    setCriteriaText(JSON.stringify(v.criteria ?? {}, null, 2));
    setBonusText(JSON.stringify(v.bonus_reward ?? {}, null, 2));
  };

  const onTypeChange = (t: string) => {
    if (!editing) return;
    const preset = CHALLENGE_TYPES.find(x => x.value === t)?.defaultCriteria ?? {};
    setEditing({ ...editing, challenge_type: t });
    setCriteriaText(JSON.stringify(preset, null, 2));
  };

  const save = async () => {
    if (!editing?.title?.trim()) return toast.error('Title required');
    if (!editing.starts_at || !editing.ends_at) return toast.error('Start and end dates required');
    if (new Date(editing.ends_at) <= new Date(editing.starts_at)) return toast.error('End must be after start');
    if (!editing.points_reward || editing.points_reward < 0) return toast.error('Points reward must be ≥ 0');

    setSaving(true);
    try {
      let criteria: any = {}, bonus: any = {};
      try { criteria = criteriaText ? JSON.parse(criteriaText) : {}; }
      catch { throw new Error('Criteria must be valid JSON'); }
      try { bonus = bonusText ? JSON.parse(bonusText) : {}; }
      catch { throw new Error('Bonus reward must be valid JSON'); }

      const payload = {
        title: editing.title!.trim(),
        description: editing.description?.trim() || null,
        challenge_type: editing.challenge_type || 'order_count',
        criteria, bonus_reward: bonus,
        points_reward: Math.floor(editing.points_reward!),
        starts_at: new Date(editing.starts_at).toISOString(),
        ends_at: new Date(editing.ends_at).toISOString(),
        max_completions: editing.max_completions ?? null,
        is_active: editing.is_active ?? true,
      };
      const q = editing.id
        ? supabase.from('loyalty_challenges').update(payload).eq('id', editing.id)
        : supabase.from('loyalty_challenges').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Challenge updated' : 'Challenge created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this challenge? Customer progress will be retained.')) return;
    try {
      const { error } = await supabase.from('loyalty_challenges').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (c: Challenge) => {
    try {
      const { error } = await supabase.from('loyalty_challenges').update({ is_active: !c.is_active }).eq('id', c.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  const statusBadge = (c: Challenge) => {
    const s = new Date(c.starts_at).getTime();
    const e = new Date(c.ends_at).getTime();
    if (!c.is_active) return <Badge variant="secondary">Inactive</Badge>;
    if (s > now) return <Badge variant="outline">Upcoming</Badge>;
    if (e <= now) return <Badge variant="destructive">Expired</Badge>;
    return <Badge>Live</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><Trophy className="h-6 w-6" /> Loyalty Challenges</h2>
          <p className="text-sm text-muted-foreground">Gamified missions that reward customers with points and bonuses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New challenge</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Live now</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Upcoming</div><div className="text-2xl font-semibold">{stats.upcoming}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'upcoming', 'expired'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No challenges match this filter.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.title}</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {statusBadge(c)}
                    <Badge variant="outline">{c.challenge_type}</Badge>
                    <Badge variant="secondary"><Coins className="h-3 w-3 mr-1 text-amber-500" />{c.points_reward}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(c.starts_at).toLocaleDateString()} → {new Date(c.ends_at).toLocaleDateString()}
                  </div>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
              </CardHeader>
              <CardContent className="pt-2">
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-20 mb-2">{JSON.stringify(c.criteria, null, 2)}</pre>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(c)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit challenge' : 'New challenge'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title *</Label>
                <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Challenge type</Label>
                <Select value={editing.challenge_type || 'order_count'} onValueChange={onTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Points reward *</Label>
                <Input type="number" min={0} value={editing.points_reward ?? 0} onChange={(e) => setEditing({ ...editing, points_reward: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Starts at *</Label>
                <Input type="datetime-local" value={toLocalInput(editing.starts_at)} onChange={(e) => setEditing({ ...editing, starts_at: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <Label>Ends at *</Label>
                <Input type="datetime-local" value={toLocalInput(editing.ends_at)} onChange={(e) => setEditing({ ...editing, ends_at: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <Label>Max completions per user</Label>
                <Input type="number" min={0} value={editing.max_completions ?? ''} placeholder="Unlimited"
                  onChange={(e) => setEditing({ ...editing, max_completions: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Toggle without deleting</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Criteria (JSON)</Label>
                <Textarea rows={4} className="font-mono text-xs" value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Bonus reward (JSON)</Label>
                <Textarea rows={3} className="font-mono text-xs" value={bonusText} onChange={(e) => setBonusText(e.target.value)} placeholder='e.g. {"voucher_code": "WIN50"}' />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save challenge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LoyaltyChallengesManager;
