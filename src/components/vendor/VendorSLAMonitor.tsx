import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface SLABreachRow {
  id: string;
  order_id: string;
  breach_type: string;
  severity: Severity | string;
  hours_overdue: number | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  sub_order_number?: string | null;
}

const sevTone: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

/**
 * Vendor-facing SLA breach watchlist.
 *
 * Scope is restricted to the active vendor by intersecting `order_sla_breaches.order_id`
 * with the vendor's own `sub_orders.id` set — RLS on sub_orders ensures we can only
 * list our own. Acknowledge / resolve actions write timestamped audit fields the
 * platform's ops dashboards already understand, so no schema changes are required.
 */
export function VendorSLAMonitor() {
  const { data: vendorId } = useVendorId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-sla-breaches', vendorId],
    enabled: !!vendorId,
    staleTime: 30_000,
    queryFn: async (): Promise<SLABreachRow[]> => {
      const { data: subs, error: subErr } = await supabase
        .from('sub_orders')
        .select('id, sub_order_number')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (subErr) throw subErr;
      const ids = (subs ?? []).map((s) => s.id);
      if (ids.length === 0) return [];

      const { data: breaches, error } = await supabase
        .from('order_sla_breaches')
        .select(
          'id, order_id, breach_type, severity, hours_overdue, detected_at, acknowledged_at, resolved_at, resolution_note',
        )
        .in('order_id', ids)
        .order('detected_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const nameById = new Map(subs!.map((s) => [s.id, s.sub_order_number]));
      return (breaches ?? []).map((b) => ({
        ...b,
        severity: b.severity as Severity,
        sub_order_number: nameById.get(b.order_id) ?? null,
      }));
    },
  });

  const summary = useMemo(() => {
    const rows = data ?? [];
    const open = rows.filter((r) => !r.resolved_at);
    return {
      total: rows.length,
      open: open.length,
      critical: open.filter((r) => r.severity === 'critical' || r.severity === 'high').length,
      acknowledged: open.filter((r) => r.acknowledged_at).length,
    };
  }, [data]);

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('order_sla_breaches')
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Breach acknowledged');
      queryClient.invalidateQueries({ queryKey: ['vendor-sla-breaches', vendorId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to acknowledge'),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const note = window.prompt('Resolution note (optional)') ?? '';
      const { error } = await supabase
        .from('order_sla_breaches')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
          resolution_note: note || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Breach resolved');
      queryClient.invalidateQueries({ queryKey: ['vendor-sla-breaches', vendorId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to resolve'),
  });

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning" />
            SLA Watchlist
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" /> Open {summary.open}
            </Badge>
            <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
              <AlertTriangle className="w-3 h-3" /> Critical {summary.critical}
            </Badge>
            <Badge variant="outline" className="gap-1">
              Ack {summary.acknowledged}/{summary.open}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success opacity-50" />
            <p className="font-medium">All SLAs are green</p>
            <p className="text-xs mt-1">Breaches against your sub-orders will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.map((b) => {
              const status = b.resolved_at ? 'resolved' : b.acknowledged_at ? 'ack' : 'open';
              return (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                        sevTone[b.severity as string] ?? sevTone.low
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {b.breach_type.replace(/_/g, ' ')}
                        {b.sub_order_number ? ` · ${b.sub_order_number}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Detected {formatDistanceToNow(new Date(b.detected_at), { addSuffix: true })}
                        {b.hours_overdue ? ` · ${Number(b.hours_overdue).toFixed(1)}h overdue` : ''}
                      </p>
                      {b.resolution_note && (
                        <p className="text-xs mt-1 text-muted-foreground italic line-clamp-2">
                          “{b.resolution_note}”
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`capitalize ${sevTone[b.severity as string] ?? ''}`}
                    >
                      {b.severity}
                    </Badge>
                    {status === 'resolved' ? (
                      <Badge className="bg-success/15 text-success border-success/30" variant="outline">
                        Resolved
                      </Badge>
                    ) : status === 'ack' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolve.mutate(b.id)}
                        disabled={resolve.isPending}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => acknowledge.mutate(b.id)}
                          disabled={acknowledge.isPending}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolve.mutate(b.id)}
                          disabled={resolve.isPending}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
