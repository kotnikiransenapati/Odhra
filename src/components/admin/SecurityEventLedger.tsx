import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type EventStats = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  sources: Record<string, number>;
  last_event_at: string | null;
};

type EventRow = {
  id: string;
  source: string;
  event_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  actor_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  ip: string | null;
  country_code: string | null;
  fingerprint_hash: string | null;
  correlation_id: string | null;
  metadata: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  occurred_at: string;
};

type Verification = {
  checked: number;
  broken_links: number;
  hash_mismatches: number;
  verified: boolean;
};

const severityVariant: Record<EventRow["severity"], "default" | "destructive" | "outline" | "secondary"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
  info: "outline",
};

export function SecurityEventLedger() {
  const { toast } = useToast();
  const [stats, setStats] = useState<EventStats | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [hours, setHours] = useState(24);
  const [severity, setSeverity] = useState("all");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    const [statsResult, feedResult] = await Promise.all([
      supabase.rpc("admin_security_event_stats" as any, { _hours: hours }),
      supabase.rpc("admin_security_event_feed" as any, {
        _limit: 150,
        _severity: severity === "all" ? null : severity,
        _source: source.trim() ? source.trim().toLowerCase() : null,
      }),
    ]);

    if (statsResult.error) {
      toast({ title: "Stats failed", description: statsResult.error.message, variant: "destructive" });
    }
    if (feedResult.error) {
      toast({ title: "Feed failed", description: feedResult.error.message, variant: "destructive" });
    }

    setStats((statsResult.data as EventStats) || null);
    setEvents(((feedResult.data as unknown) as EventRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, severity]);

  const verifyLedger = async () => {
    setVerifying(true);
    const { data, error } = await supabase.rpc("admin_verify_security_ledger" as any, { _limit: 1000 });
    setVerifying(false);
    if (error) return toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    setVerification((data as Verification) || null);
    toast({ title: (data as Verification)?.verified ? "Ledger verified" : "Ledger integrity issue found" });
  };

  const sourceEntries = useMemo(() => Object.entries(stats?.sources || {}).sort((a, b) => b[1] - a[1]), [stats]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Security Event Ledger</h1>
          <p className="text-muted-foreground">Tamper-evident security timeline with hash-chain verification.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="bg-background border rounded-md px-3 text-sm h-9" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={168}>7d</option>
            <option value={720}>30d</option>
          </select>
          <select className="bg-background border rounded-md px-3 text-sm h-9" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh security events"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={verifyLedger} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Verify chain
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Total", stats?.total], ["Critical", stats?.critical], ["High", stats?.high],
          ["Medium", stats?.medium], ["Low", stats?.low], ["Info", stats?.info],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{loading ? "…" : String(value ?? 0)}</p>
          </CardContent></Card>
        ))}
      </div>

      {(verification || sourceEntries.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Ledger Integrity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {verification ? (
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <Badge variant={verification.verified ? "default" : "destructive"}>{verification.verified ? "Verified" : "Issue found"}</Badge>
                  <span>{verification.checked} events checked</span>
                  <span className="text-muted-foreground">{verification.broken_links} broken links · {verification.hash_mismatches} hash mismatches</span>
                </div>
              ) : <p className="text-sm text-muted-foreground">Run verification to inspect the latest hash-chain segment.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Sources</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              {sourceEntries.length === 0 ? <span className="text-sm text-muted-foreground">No source activity.</span> : sourceEntries.map(([name, count]) => (
                <Badge key={name} variant="secondary" className="gap-1"><span>{name}</span><span>{count}</span></Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Event Feed</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Filter source" className="h-9 sm:w-48" />
            <Button variant="outline" onClick={load}>Apply</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : events.length === 0 ? <p className="text-sm text-muted-foreground py-4">No security events found.</p>
            : <div className="space-y-2 max-h-[620px] overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="p-3 rounded border hover:bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={severityVariant[event.severity]}>{event.severity.toUpperCase()}</Badge>
                          <code className="text-xs font-medium break-all">{event.event_type}</code>
                          <Badge variant="outline">{event.source}</Badge>
                          {event.country_code && <Badge variant="secondary">{event.country_code}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
                          {event.ip && ` · ${event.ip}`}
                          {event.subject_type && ` · ${event.subject_type}:${event.subject_id || "unknown"}`}
                        </p>
                      </div>
                      {event.severity === "critical" && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
                    </div>
                    <div className="grid gap-2 text-xs md:grid-cols-2">
                      <code className="bg-muted/50 rounded p-2 overflow-x-auto">hash {event.event_hash}</code>
                      <code className="bg-muted/50 rounded p-2 overflow-x-auto">prev {event.previous_hash || "GENESIS"}</code>
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32">{JSON.stringify(event.metadata, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityEventLedger;