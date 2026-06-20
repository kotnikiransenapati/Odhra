/**
 * Q6: Status Page Publisher (admin) — preview the public status JSON consumers will see
 * and expose its public URL for embedding in external monitors.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, Globe, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Snapshot = {
  generated_at: string;
  overall: "all_systems_operational" | "degraded" | "major_outage";
  components: Array<{ name: string; status: string; uptime_30d_pct: number; last_latency_ms: number | null }>;
  incidents: any[];
  open_incident_count: number;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/status-page-publisher`;

const overallBadge: Record<Snapshot["overall"], string> = {
  all_systems_operational: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  degraded: "bg-amber-500/10 text-amber-700 border-amber-300",
  major_outage: "bg-red-500/10 text-red-700 border-red-300",
};

export function StatusPagePublisher() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("status-page-publisher");
      if (error) throw error;
      setSnap(data as Snapshot);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to fetch snapshot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(FN_URL);
    toast.success("Public status URL copied");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Status Page Publisher</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="h-4 w-4 mr-1" /> Copy URL</Button>
          <Button size="sm" variant="outline" asChild>
            <a href={FN_URL} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Open JSON</a>
          </Button>
          <Button size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground break-all">
          Public endpoint (no auth): <code>{FN_URL}</code>
        </div>

        {snap && (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm text-muted-foreground">Overall status</div>
                <Badge className={overallBadge[snap.overall]}>{snap.overall.replaceAll("_", " ")}</Badge>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Open incidents: <span className="font-semibold text-foreground">{snap.open_incident_count}</span><br />
                Generated {new Date(snap.generated_at).toLocaleString()}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Components</h4>
              <div className="grid gap-2">
                {snap.components.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        c.status === "operational" ? "bg-emerald-500" :
                        c.status === "degraded" ? "bg-amber-500" :
                        c.status === "outage" ? "bg-red-500" : "bg-muted-foreground"
                      }`} />
                      <span>{c.name}</span>
                      <Badge variant="outline">{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      uptime 30d: <strong>{c.uptime_30d_pct}%</strong>
                      {c.last_latency_ms != null && <> · {c.last_latency_ms}ms</>}
                    </div>
                  </div>
                ))}
                {!snap.components.length && <p className="text-sm text-muted-foreground">No probes configured.</p>}
              </div>
            </div>

            <details className="rounded-md border p-2">
              <summary className="cursor-pointer text-sm font-medium">Raw JSON</summary>
              <pre className="text-xs overflow-auto mt-2 max-h-72">{JSON.stringify(snap, null, 2)}</pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default StatusPagePublisher;
