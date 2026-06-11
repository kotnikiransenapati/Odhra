import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ShieldAlert, RefreshCw, Calculator } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Row {
  id: string; user_id: string; score: number; tier: string;
  factors: any; manual_override: boolean; override_reason: string | null;
  last_computed_at: string; email: string | null; full_name: string | null;
}

const TIERS = ['low', 'medium', 'high', 'critical'];

export function CustomerRiskScores() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [tier, setTier] = useState('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Row | null>(null);
  const [override, setOverride] = useState({ score: 50, reason: '' });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_risk_scores_stats' as any),
      supabase.rpc('admin_risk_scores_list' as any, { _tier: tier === 'all' ? null : tier, _limit: 200 }),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tier]);

  const recompute = async (userId: string) => {
    const { error } = await supabase.rpc('compute_customer_risk_score' as any, { _user_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success('Recomputed');
    load();
  };

  const applyOverride = async () => {
    if (!active) return;
    if (!override.reason.trim()) { toast.error('Reason required'); return; }
    const { error } = await supabase.rpc('admin_override_risk_score' as any, {
      _user_id: active.user_id, _score: override.score, _reason: override.reason,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Score overridden');
    setOpen(false); setActive(null);
    load();
  };

  const tierVariant = (t: string): any =>
    t === 'critical' ? 'destructive' : t === 'high' ? 'destructive' : t === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6" /> Customer Risk Scores</h2>
          <p className="text-sm text-muted-foreground">Fraud-risk profile derived from orders, payments, returns & login signals</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { l: 'Tracked', v: stats.total ?? 0 },
          { l: 'Critical', v: stats.critical ?? 0, color: 'text-destructive' },
          { l: 'High', v: stats.high ?? 0, color: 'text-destructive' },
          { l: 'Medium', v: stats.medium ?? 0 },
          { l: 'Avg Score', v: stats.avg_score ?? 0 },
          { l: 'Overrides', v: stats.overrides ?? 0 },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profiled Users</CardTitle>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-44 mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No scored users yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>User</TableHead><TableHead>Score</TableHead><TableHead>Tier</TableHead>
                  <TableHead>Factors</TableHead><TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.full_name || '—'}</div>
                        <div className="font-mono text-muted-foreground">{r.email || r.user_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="font-bold">{r.score}</TableCell>
                      <TableCell>
                        <Badge variant={tierVariant(r.tier)}>{r.tier}</Badge>
                        {r.manual_override && <Badge variant="outline" className="ml-1 text-[10px]">override</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.factors?.failed_payments ?? 0} fail · {r.factors?.returns ?? 0} ret · {r.factors?.login_failures_30d ?? 0} login
                      </TableCell>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(r.last_computed_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => recompute(r.user_id)}>
                          <Calculator className="w-3 h-3 mr-1" />Recompute
                        </Button>
                        <Button size="sm" onClick={() => { setActive(r); setOverride({ score: r.score, reason: '' }); setOpen(true); }}>
                          Override
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Override</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{active?.email || active?.user_id}</div>
            <div>
              <Label>Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={override.score}
                onChange={e => setOverride({ ...override, score: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })} />
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={override.reason} onChange={e => setOverride({ ...override, reason: e.target.value })}
                placeholder="Why is this score being manually set?" />
            </div>
            <Button onClick={applyOverride} className="w-full">Apply Override</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
