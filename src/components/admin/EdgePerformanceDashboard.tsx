import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Summary = {
  function_name: string;
  invocations: number;
  errors: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  avg_ms: number;
  max_ms: number;
  last_seen: string;
};

type TrendPoint = {
  bucket: string;
  invocations: number;
  errors: number;
  p95_ms: number;
  avg_ms: number;
};

export function EdgePerformanceDashboard() {
  const [hours, setHours] = useState(1);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_edge_metrics_summary", {
      _hours: hours,
    });
    if (!error && Array.isArray(data)) {
      const rows = data as Summary[];
      setSummary(rows);
      if (!selected && rows[0]) setSelected(rows[0].function_name);
    }
    setLoading(false);
  }, [hours, selected]);

  const loadTrend = useCallback(async (fn: string) => {
    setTrendLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_edge_metrics_trend", {
      _function_name: fn,
      _hours: Math.max(hours, 6),
    });
    if (!error && Array.isArray(data)) {
      setTrend(
        (data as TrendPoint[]).map((p) => ({
          ...p,
          bucket: format(new Date(p.bucket), "HH:mm"),
        })),
      );
    }
    setTrendLoading(false);
  }, [hours]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selected) loadTrend(selected);
  }, [selected, loadTrend]);

  const totals = summary.reduce(
    (acc, s) => {
      acc.invocations += Number(s.invocations);
      acc.errors += Number(s.errors);
      return acc;
    },
    { invocations: 0, errors: 0 },
  );
  const overallRate = totals.invocations
    ? ((totals.errors / totals.invocations) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Edge Function Performance
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Latency percentiles &amp; error rates across all edge functions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="text-sm rounded-md border border-input bg-background px-3 py-2"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Functions</div>
          <div className="text-3xl font-bold mt-1">{summary.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Invocations</div>
          <div className="text-3xl font-bold mt-1">{totals.invocations.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Errors (5xx)</div>
          <div className="text-3xl font-bold mt-1 text-red-600">{totals.errors.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Error Rate</div>
          <div className={cn("text-3xl font-bold mt-1", Number(overallRate) > 1 ? "text-red-600" : "text-emerald-600")}>
            {overallRate}%
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Trend
            {selected && <Badge variant="secondary" className="font-mono">{selected}</Badge>}
          </h3>
        </div>
        {trendLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : trend.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">No trend data for this window.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "ms", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="p95_ms" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="p95 (ms)" />
              <Line yAxisId="left" type="monotone" dataKey="avg_ms" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} name="avg (ms)" />
              <Line yAxisId="right" type="monotone" dataKey="invocations" stroke="#10b981" strokeWidth={1.5} dot={false} name="invocations" />
              <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1.5} dot={false} name="errors" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Function</th>
                <th className="text-right px-3 py-3">Invocations</th>
                <th className="text-right px-3 py-3">Errors</th>
                <th className="text-right px-3 py-3">Error %</th>
                <th className="text-right px-3 py-3">p50</th>
                <th className="text-right px-3 py-3">p95</th>
                <th className="text-right px-3 py-3">p99</th>
                <th className="text-right px-3 py-3">Max</th>
              </tr>
            </thead>
            <tbody>
              {loading && summary.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : summary.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No metrics yet. Wrap your edge handlers with <code className="px-1.5 py-0.5 rounded bg-muted text-xs">withEdgeMetrics()</code>.
                </td></tr>
              ) : (
                summary.map((s) => {
                  const hot = s.error_rate > 1;
                  return (
                    <motion.tr
                      key={s.function_name}
                      onClick={() => setSelected(s.function_name)}
                      whileHover={{ backgroundColor: "hsl(var(--muted)/0.5)" }}
                      className={cn(
                        "border-t cursor-pointer transition-colors",
                        selected === s.function_name && "bg-primary/5",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                        {hot && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        {s.function_name}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">{Number(s.invocations).toLocaleString()}</td>
                      <td className="text-right px-3 py-3 tabular-nums text-red-600">{Number(s.errors).toLocaleString()}</td>
                      <td className={cn("text-right px-3 py-3 tabular-nums", hot ? "text-red-600 font-semibold" : "")}>{Number(s.error_rate).toFixed(2)}%</td>
                      <td className="text-right px-3 py-3 tabular-nums">{Math.round(Number(s.p50_ms))}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{Math.round(Number(s.p95_ms))}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{Math.round(Number(s.p99_ms))}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{s.max_ms}</td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
