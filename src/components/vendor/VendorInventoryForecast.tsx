import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Package, ChevronRight, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ForecastRow {
  id: string;
  product_id: string;
  avg_daily_sales: number | null;
  sales_trend: string | null;
  days_until_stockout: number | null;
  recommended_reorder_qty: number | null;
  confidence_score: number | null;
  computed_at: string;
  product: { id: string; title: string; stock: number | null; primary_image: string | null } | null;
}

type Filter = 'all' | 'critical' | 'warning' | 'healthy';

const trendIcon = (t: string | null) => {
  if (t === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (t === 'down') return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const bucket = (days: number | null): Filter => {
  if (days == null) return 'healthy';
  if (days <= 7) return 'critical';
  if (days <= 21) return 'warning';
  return 'healthy';
};

const bucketTone: Record<Filter, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  healthy: 'bg-success/15 text-success border-success/30',
  all: '',
};

/**
 * Vendor inventory forecast panel.
 *
 * Joins `inventory_forecasts` against the vendor's own products. The forecast
 * table is computed server-side by `compute_inventory_forecasts`; here we only
 * read and surface actionable bucketing (critical / warning / healthy) plus
 * reorder quantities so vendors can plan restocks.
 */
export function VendorInventoryForecast() {
  const { data: vendorId } = useVendorId();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-inventory-forecasts', vendorId],
    enabled: !!vendorId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ForecastRow[]> => {
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, title, stock, primary_image')
        .eq('vendor_id', vendorId!)
        .limit(500);
      if (prodErr) throw prodErr;
      const ids = (products ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data: forecasts, error } = await supabase
        .from('inventory_forecasts')
        .select(
          'id, product_id, avg_daily_sales, sales_trend, days_until_stockout, recommended_reorder_qty, confidence_score, computed_at',
        )
        .in('product_id', ids)
        .order('days_until_stockout', { ascending: true, nullsFirst: false })
        .limit(200);
      if (error) throw error;

      const map = new Map(products!.map((p) => [p.id, p]));
      return (forecasts ?? []).map((f) => ({
        ...f,
        product: map.get(f.product_id) ?? null,
      })) as ForecastRow[];
    },
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const text = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && bucket(r.days_until_stockout) !== filter) return false;
      if (text && !(r.product?.title.toLowerCase().includes(text))) return false;
      return true;
    });
  }, [data, filter, q]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      critical: rows.filter((r) => bucket(r.days_until_stockout) === 'critical').length,
      warning: rows.filter((r) => bucket(r.days_until_stockout) === 'warning').length,
      healthy: rows.filter((r) => bucket(r.days_until_stockout) === 'healthy').length,
    };
  }, [data]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Inventory Forecast
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              ≤7d {stats.critical}
            </Badge>
            <Badge variant="outline" className="border-warning/30 text-warning">
              ≤21d {stats.warning}
            </Badge>
            <Badge variant="outline" className="border-success/30 text-success">
              Healthy {stats.healthy}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product…"
            className="h-9 max-w-xs"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical (≤7d)</SelectItem>
              <SelectItem value="warning">Warning (≤21d)</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No forecasts in this view</p>
            <p className="text-xs mt-1">
              Forecasts are computed periodically — check back after a few sales cycles.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => {
              const b = bucket(f.days_until_stockout);
              return (
                <Link
                  key={f.id}
                  to={`/vendor/products/${f.product_id}/edit`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                    {f.product?.primary_image ? (
                      <img
                        src={f.product.primary_image}
                        alt={f.product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {f.product?.title ?? 'Unknown product'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      {trendIcon(f.sales_trend)}
                      {Number(f.avg_daily_sales ?? 0).toFixed(1)}/day · stock {f.product?.stock ?? 0}
                      <span className="opacity-60">
                        · {formatDistanceToNow(new Date(f.computed_at), { addSuffix: true })}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3 shrink-0">
                    <div>
                      <Badge variant="outline" className={`capitalize ${bucketTone[b]}`}>
                        {f.days_until_stockout != null ? `${f.days_until_stockout}d left` : '—'}
                      </Badge>
                      {f.recommended_reorder_qty ? (
                        <p className="text-[11px] mt-1 text-muted-foreground">
                          Reorder {f.recommended_reorder_qty}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
