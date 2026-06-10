import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, AlertOctagon, Gauge, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Rollup = {
  function_name: string;
  calls: number;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  error_rate: number | null;
  last_seen: string;
};

type SLO = {
  id: string;
  name: string;
  description: string | null;
  target_type: "latency_ms" | "error_rate" | "availability";
  target_value: number;
  window_minutes: number;
  scope: string;
  scope_ref: string | null;
  enabled: boolean;
};

type DLQ = {
  id: string;
  job_type: string;
  error_message: string;
  attempts: number;
  status: string;
  source: string | null;
  created_at: string;
  last_attempt_at: string;
};

const fmtMs = (n: number | null) => (n == null ? "—" : `${Math.round(n)}ms`);
const fmtPct = (n: number | null) =>
  n == null ? "—" : `${(n * 100).toFixed(2)}%`;

export function ObservabilityDashboard() {
  const [rollups, setRollups] = useState<Rollup[]>([]);
  const [slos, setSlos] = useState<SLO[]>([]);
  const [dlq, setDlq] = useState<DLQ[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, s, d] = await Promise.all([
      (supabase as any).from("edge_function_slo_rollup").select("*").order("calls", { ascending: false }),
      (supabase as any).from("slo_definitions").select("*").order("name"),
      (supabase as any)
        .from("dead_letter_queue")
        .select("*")
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (r.data) setRollups(r.data as Rollup[]);
    if (s.data) setSlos(s.data as SLO[]);
    if (d.data) setDlq(d.data as DLQ[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const breaches = slos
    .filter((s) => s.enabled && s.scope === "edge_function")
    .map((slo) => {
      const target = slo.scope_ref;
      const matches = target
        ? rollups.filter((r) => r.function_name === target)
        : rollups;
      const broken = matches.filter((r) => {
        if (slo.target_type === "latency_ms")
          return (r.p95_ms ?? 0) > slo.target_value;
        if (slo.target_type === "error_rate")
          return (r.error_rate ?? 0) > slo.target_value;
        return false;
      });
      return { slo, broken };
    })
    .filter((b) => b.broken.length > 0);

  const resolveDlq = async (id: string) => {
    const { error } = await supabase
      .from("dead_letter_queue")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked resolved");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> Observability & Reliability
          </h2>
          <p className="text-sm text-muted-foreground">
            Edge function latency, SLO breaches and the dead-letter queue.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Tracked Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rollups.length}</div>
            <p className="text-xs text-muted-foreground">in the last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" /> SLO Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {breaches.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {slos.filter((s) => s.enabled).length} active SLOs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dead-Letter Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dlq.length}</div>
            <p className="text-xs text-muted-foreground">unresolved jobs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="latency">
        <TabsList>
          <TabsTrigger value="latency">Latency</TabsTrigger>
          <TabsTrigger value="slos">SLOs</TabsTrigger>
          <TabsTrigger value="dlq">Dead-Letter Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="latency">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Function</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">p50</TableHead>
                    <TableHead className="text-right">p95</TableHead>
                    <TableHead className="text-right">p99</TableHead>
                    <TableHead className="text-right">Error rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No metrics in the last hour.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rollups.map((r) => (
                      <TableRow key={r.function_name}>
                        <TableCell className="font-mono text-sm">{r.function_name}</TableCell>
                        <TableCell className="text-right">{r.calls}</TableCell>
                        <TableCell className="text-right">{fmtMs(r.p50_ms)}</TableCell>
                        <TableCell className="text-right">{fmtMs(r.p95_ms)}</TableCell>
                        <TableCell className="text-right">{fmtMs(r.p99_ms)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={(r.error_rate ?? 0) > 0.05 ? "destructive" : "secondary"}
                          >
                            {fmtPct(r.error_rate)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No SLOs defined yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    slos.map((s) => {
                      const breached = breaches.find((b) => b.slo.id === s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.target_type}</TableCell>
                          <TableCell>
                            {s.target_type === "error_rate"
                              ? fmtPct(s.target_value)
                              : s.target_type === "latency_ms"
                                ? fmtMs(s.target_value)
                                : s.target_value}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.scope_ref ?? s.scope}
                          </TableCell>
                          <TableCell>
                            {!s.enabled ? (
                              <Badge variant="outline">Disabled</Badge>
                            ) : breached ? (
                              <Badge variant="destructive">Breached</Badge>
                            ) : (
                              <Badge variant="secondary">Healthy</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlq">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Last attempt</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlq.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Queue is empty.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dlq.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.job_type}</TableCell>
                        <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                          {d.error_message}
                        </TableCell>
                        <TableCell className="text-right">{d.attempts}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(d.last_attempt_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => resolveDlq(d.id)}>
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ObservabilityDashboard;
