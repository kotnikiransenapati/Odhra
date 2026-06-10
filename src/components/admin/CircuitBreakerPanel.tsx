import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Gauge, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CircuitBreaker {
  service_key: string;
  label: string;
  category: string;
  state: 'closed' | 'open' | 'half_open' | string;
  failure_count: number;
  success_count: number;
  failure_threshold: number;
  cooldown_seconds: number;
  opened_until: string | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  updated_at: string;
}

const CATEGORY_ORDER = ['payments', 'logistics', 'messaging', 'ai', 'general'];

function stateTone(state: string) {
  if (state === 'open') return 'destructive' as const;
  if (state === 'half_open') return 'secondary' as const;
  return 'outline' as const;
}

function stateIcon(state: string) {
  if (state === 'open') return <ShieldAlert className="h-4 w-4" />;
  if (state === 'half_open') return <AlertTriangle className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}

export function CircuitBreakerPanel() {
  const [rows, setRows] = useState<CircuitBreaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<CircuitBreaker | null>(null);
  const [nextState, setNextState] = useState<'closed' | 'open' | 'half_open'>('closed');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_circuit_breakers');
    setLoading(false);
    if (error) {
      toast.error('Failed to load circuit breakers', { description: error.message });
      return;
    }
    setRows((data ?? []) as CircuitBreaker[]);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('outbound_circuit_breakers_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outbound_circuit_breakers' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, CircuitBreaker[]>();
    rows.forEach((row) => map.set(row.category, [...(map.get(row.category) ?? []), row]));
    return [...map.entries()].sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
  }, [rows]);

  const openCount = rows.filter((row) => row.state === 'open').length;
  const halfOpenCount = rows.filter((row) => row.state === 'half_open').length;

  const startChange = (row: CircuitBreaker) => {
    setTarget(row);
    setNextState(row.state === 'closed' ? 'open' : 'closed');
    setReason('');
  };

  const applyChange = async () => {
    if (!target) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('admin_set_circuit_breaker', {
      _service_key: target.service_key,
      _state: nextState,
      _reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Circuit update failed', { description: error.message });
      return;
    }
    haptic('medium');
    toast.success(`${target.label} set to ${nextState}`);
    setTarget(null);
    setReason('');
    load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }} className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-accent" /> Outbound Circuit Breakers
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Fail-fast controls for payment, shipping, messaging, and AI providers.</p>
          </div>
          <div className="flex items-center gap-2">
            {openCount > 0 && <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> {openCount} open</Badge>}
            {halfOpenCount > 0 && <Badge variant="secondary">{halfOpenCount} half-open</Badge>}
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh circuit breakers">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {grouped.map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{category}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((row) => {
                  const progress = Math.min(100, Math.round((row.failure_count / Math.max(row.failure_threshold, 1)) * 100));
                  return (
                    <div key={row.service_key} className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{row.label}</span>
                            <Badge variant={stateTone(row.state)} className="gap-1">{stateIcon(row.state)} {row.state}</Badge>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground mt-1">{row.service_key}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => startChange(row)}>
                          <Wrench className="h-4 w-4 mr-1" /> Set
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Failures</span>
                          <span>{row.failure_count}/{row.failure_threshold}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-destructive transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Successes: {row.success_count.toLocaleString('en-IN')}</span>
                        <span>Cooldown: {Math.round(row.cooldown_seconds / 60)}m</span>
                        <span>Last success: {row.last_success_at ? formatDistanceToNow(new Date(row.last_success_at), { addSuffix: true }) : '—'}</span>
                        <span>Last failure: {row.last_failure_at ? formatDistanceToNow(new Date(row.last_failure_at), { addSuffix: true }) : '—'}</span>
                      </div>

                      {row.opened_until && row.state === 'open' && (
                        <div className="text-xs text-destructive">Retries after {formatDistanceToNow(new Date(row.opened_until), { addSuffix: true })}</div>
                      )}
                      {row.last_error && <div className="rounded border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive line-clamp-2">{row.last_error}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No circuit breakers configured.</div>}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set circuit state</DialogTitle></DialogHeader>
          {target && (
            <div className="space-y-4">
              <div className="text-sm"><span className="font-medium">{target.label}</span> is currently <Badge variant={stateTone(target.state)}>{target.state}</Badge></div>
              <Select value={nextState} onValueChange={(value) => setNextState(value as 'closed' | 'open' | 'half_open')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed — allow traffic</SelectItem>
                  <SelectItem value="open">Open — block traffic</SelectItem>
                  <SelectItem value="half_open">Half-open — test recovery</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason or incident note" rows={3} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTarget(null)} disabled={submitting}>Cancel</Button>
                <Button onClick={applyChange} disabled={submitting}>Apply state</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}