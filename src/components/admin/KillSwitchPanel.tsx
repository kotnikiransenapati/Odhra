import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertOctagon, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface KillSwitch {
  key: string;
  label: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  reason: string | null;
  toggled_by: string | null;
  toggled_at: string;
}

const CATEGORY_ORDER = ['commerce', 'payments', 'auth', 'ai', 'marketing', 'vendor', 'content', 'rewards', 'general'];

export function KillSwitchPanel() {
  const [rows, setRows] = useState<KillSwitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<KillSwitch | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kill_switches')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: 'Failed to load kill switches', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data || []) as KillSwitch[]);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('kill_switches_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kill_switches' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, KillSwitch[]>();
    rows.forEach((r) => {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    });
    return Array.from(map.entries()).sort(
      ([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
    );
  }, [rows]);

  const killedCount = rows.filter((r) => !r.is_enabled).length;

  const confirmToggle = async () => {
    if (!pending) return;
    const targetEnabled = !pending.is_enabled;
    if (!targetEnabled && reason.trim().length < 3) {
      toast({ title: 'Reason required', description: 'Please add a short reason for disabling.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('toggle_kill_switch', {
      _key: pending.key,
      _enabled: targetEnabled,
      _reason: targetEnabled ? null : reason.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Toggle failed', description: error.message, variant: 'destructive' });
      return;
    }
    haptic('medium');
    toast({
      title: targetEnabled ? `${pending.label} re-enabled` : `${pending.label} disabled`,
      description: targetEnabled ? 'Feature is live again.' : 'Edge functions will block this feature within seconds.',
    });
    setPending(null);
    setReason('');
    load();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-destructive" />
                Kill Switches
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Instantly disable high-impact features. Edge functions read the latest state per request.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {killedCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" /> {killedCount} disabled
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && rows.length === 0 && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            )}

            <AnimatePresence initial={false}>
              {grouped.map(([cat, items]) => (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    {cat}
                  </h3>
                  <div className="space-y-2">
                    {items.map((row) => (
                      <div
                        key={row.key}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${
                          row.is_enabled ? 'bg-card' : 'bg-destructive/5 border-destructive/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{row.label}</span>
                            {row.is_enabled ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs gap-1">
                                <ShieldCheck className="h-3 w-3" /> live
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" /> killed
                              </Badge>
                            )}
                          </div>
                          {row.description && (
                            <p className="text-xs text-muted-foreground mt-1">{row.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono">{row.key}</span>
                            <span>· updated {formatDistanceToNow(new Date(row.toggled_at), { addSuffix: true })}</span>
                            {!row.is_enabled && row.reason && (
                              <span className="text-destructive">· reason: {row.reason}</span>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={row.is_enabled}
                          onCheckedChange={() => { setReason(''); setPending(row); }}
                          aria-label={`Toggle ${row.label}`}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!loading && rows.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No kill switches configured.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.is_enabled ? `Disable ${pending?.label}?` : `Re-enable ${pending?.label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.is_enabled
                ? 'This will immediately block the feature across all edge functions and storefront flows that check this switch.'
                : 'This will restore normal operation for this feature.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.is_enabled && (
            <Textarea
              autoFocus
              placeholder="Reason (required) — e.g. payment provider outage, abuse spike, scheduled maintenance…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmToggle(); }}
              disabled={submitting}
              className={pending?.is_enabled ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {submitting ? 'Working…' : pending?.is_enabled ? 'Disable feature' : 'Re-enable feature'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
