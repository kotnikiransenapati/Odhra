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
import { Shield, Plus, Edit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

type Rule = {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: any;
  action: string;
  risk_score_contribution: number | null;
  is_active: boolean | null;
};

const RULE_TYPES = ['velocity', 'amount', 'geo', 'device', 'pattern', 'blacklist', 'whitelist', 'custom'];
const ACTIONS = ['flag', 'review', 'challenge', 'block', 'allow'];

const blank = (): Partial<Rule> & { conditionsText?: string } => ({
  name: '', description: '', rule_type: 'pattern', action: 'flag',
  risk_score_contribution: 25, is_active: true, conditionsText: '{\n  \n}',
});

export function FraudRulesManager() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<Rule> & { conditionsText?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_rules')
        .select('*')
        .order('risk_score_contribution', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setRows((data as Rule[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (typeFilter !== 'all' && r.rule_type !== typeFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
    });
  }, [rows, search, typeFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active).length,
    blocking: rows.filter(r => r.is_active && r.action === 'block').length,
  }), [rows]);

  const startEdit = (r?: Rule) => setEditing(r
    ? { ...r, conditionsText: JSON.stringify(r.conditions ?? {}, null, 2) }
    : blank());

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error('Name required');
    let conditions: any = {};
    try { conditions = JSON.parse(editing.conditionsText || '{}'); }
    catch { return toast.error('Conditions must be valid JSON'); }
    if (typeof conditions !== 'object' || Array.isArray(conditions)) {
      return toast.error('Conditions must be a JSON object');
    }
    const score = Math.max(0, Math.min(100, Number(editing.risk_score_contribution ?? 0) || 0));
    setSaving(true);
    try {
      const payload: any = {
        name: editing.name!.trim(),
        description: editing.description?.trim() || null,
        rule_type: editing.rule_type || 'pattern',
        conditions,
        action: editing.action || 'flag',
        risk_score_contribution: score,
        is_active: editing.is_active ?? true,
      };
      const q = editing.id
        ? supabase.from('fraud_rules').update(payload).eq('id', editing.id)
        : supabase.from('fraud_rules').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Rule updated' : 'Rule created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this fraud rule? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('fraud_rules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (r: Rule) => {
    try {
      const { error } = await supabase.from('fraud_rules').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  const actionVariant = (a: string) =>
    a === 'block' ? 'destructive' : a === 'challenge' || a === 'review' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><Shield className="h-6 w-6" /> Fraud Rules</h2>
          <p className="text-sm text-muted-foreground">Configurable risk-engine rules evaluated during checkout and account events.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New rule</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total rules</div><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Blocking</div><div className="text-2xl font-semibold">{stats.blocking}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search rules…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {RULE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No rules found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{r.name}</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="capitalize">{r.rule_type}</Badge>
                    <Badge variant={actionVariant(r.action) as any} className="capitalize">{r.action}</Badge>
                    {(r.risk_score_contribution ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />+{r.risk_score_contribution}
                      </Badge>
                    )}
                    <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <Switch checked={!!r.is_active} onCheckedChange={() => toggleActive(r)} />
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                <pre className="text-xs bg-muted/40 rounded p-2 max-h-24 overflow-auto font-mono">{JSON.stringify(r.conditions ?? {}, null, 2)}</pre>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => startEdit(r)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit rule' : 'New fraud rule'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Rule type</Label>
                <Select value={editing.rule_type || 'pattern'} onValueChange={(v) => setEditing({ ...editing, rule_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={editing.action || 'flag'} onValueChange={(v) => setEditing({ ...editing, action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Risk score contribution (0–100)</Label>
                <Input type="number" min={0} max={100} value={editing.risk_score_contribution ?? 0}
                  onChange={(e) => setEditing({ ...editing, risk_score_contribution: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive rules are skipped at evaluation</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Conditions (JSON)</Label>
                <Textarea rows={8} className="font-mono text-xs"
                  value={editing.conditionsText || '{}'}
                  onChange={(e) => setEditing({ ...editing, conditionsText: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">
                  Free-form JSON object consumed by the risk engine. Example: {'{"field":"order_total","op":"gt","value":50000}'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FraudRulesManager;
