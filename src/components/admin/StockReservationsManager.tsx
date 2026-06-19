import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Lock, RefreshCw, Trash2, Clock, Zap } from 'lucide-react';

type Reservation = {
  id: string;
  user_id: string | null;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: string;
  expires_at: string;
  confirmed_at: string | null;
  released_at: string | null;
  order_id: string | null;
  reason: string | null;
  created_at: string;
};

const STATUSES = ['held', 'confirmed', 'released', 'expired'] as const;

const statusColor = (s: string) => ({
  held: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  released: 'bg-muted text-muted-foreground',
  expired: 'bg-red-500/10 text-red-700 dark:text-red-300',
}[s] || 'bg-muted');

export function StockReservationsManager() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('held');
  const [expiring, setExpiring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data as Reservation[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load reservations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runExpire = async () => {
    setExpiring(true);
    try {
      const { data, error } = await supabase.rpc('expire_stock_reservations');
      if (error) throw error;
      toast.success(`Expired ${data || 0} reservations`);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setExpiring(false); }
  };

  const release = async (id: string) => {
    try {
      const { error } = await supabase.rpc('stock_release', { _reservation_id: id });
      if (error) throw error;
      toast.success('Reservation released');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter(r => r.status === s).length;
    return acc;
  }, { all: rows.length });

  const timeRemaining = (expires: string) => {
    const ms = new Date(expires).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6" /> Stock Reservations
          </h2>
          <p className="text-sm text-muted-foreground">
            Short-lived stock holds placed during checkout to prevent oversells.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={runExpire} disabled={expiring} className="gap-1">
            <Zap className="h-4 w-4" />
            {expiring ? 'Expiring…' : 'Expire Stale Holds'}
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          {STATUSES.map(s => (
            <TabsTrigger key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No reservations</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {filtered.map(r => (
                <Card key={r.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs text-muted-foreground">{r.id.slice(0, 8)}</code>
                        <Badge className={statusColor(r.status)}>{r.status}</Badge>
                        <Badge variant="secondary">Qty {r.quantity}</Badge>
                        {r.reason && <Badge variant="outline">{r.reason}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="truncate">Product: {r.product_id.slice(0, 8)}…</span>
                        {r.status === 'held' && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeRemaining(r.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {r.status === 'held' && (
                      <Button size="sm" variant="outline" onClick={() => release(r.id)} className="gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Release
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StockReservationsManager;
