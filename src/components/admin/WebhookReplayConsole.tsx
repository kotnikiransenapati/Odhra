import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, RefreshCw, Webhook, AlertTriangle, ListRestart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type WebhookEvent = { id: string; provider: string; event_id: string; event_type: string | null; status: string; error: string | null; processed_at: string | null; created_at: string };
type DLQEntry = { id: string; job_type: string; status: string; attempts: number; error_message: string; last_attempt_at: string; next_retry_at: string | null; created_at: string; source: string | null };

const statusTone = (s: string): BadgeProps["variant"] => {
  if (s === "processed" || s === "resolved") return "outline";
  if (s === "failed" || s === "dead") return "destructive";
  if (s === "pending" || s === "retry") return "default";
  return "secondary";
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const db = supabase as unknown as Rpc;

export function WebhookReplayConsole() {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [dlq, setDlq] = useState<DLQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [wh, dl] = await Promise.all([
      (supabase as any).from("webhook_events").select("*").order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("dead_letter_queue").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (wh.error) toast.error(wh.error.message);
    if (dl.error) toast.error(dl.error.message);
    setWebhooks((wh.data ?? []) as WebhookEvent[]);
    setDlq((dl.data ?? []) as DLQEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredWebhooks = useMemo(() => webhooks.filter(w => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (search && !`${w.provider} ${w.event_type ?? ""} ${w.event_id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [webhooks, search, statusFilter]);

  const counts = useMemo(() => ({
    webhook_total: webhooks.length,
    webhook_failed: webhooks.filter(w => w.status === "failed").length,
    dlq_total: dlq.length,
    dlq_open: dlq.filter(d => d.status !== "resolved").length,
  }), [webhooks, dlq]);

  const replayWebhook = async (id: string) => {
    const { error } = await db.rpc("admin_replay_webhook_event", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Webhook requeued"); load();
  };
  const replayDlq = async (id: string) => {
    const { error } = await db.rpc("admin_replay_dlq_entry", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("DLQ entry requeued"); load();
  };
  const resolveDlq = async (id: string) => {
    const note = window.prompt("Resolution note (optional)") ?? "";
    const { error } = await db.rpc("admin_resolve_dlq_entry", { _id: id, _note: note });
    if (error) return toast.error(error.message);
    toast.success("Marked resolved"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Webhook className="w-6 h-6 text-primary" /> Webhook Replay Console</h2>
          <p className="text-sm text-muted-foreground mt-1">Inspect inbound webhook deliveries and dead-letter queue entries with audit-logged replay.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([["Webhook events", counts.webhook_total], ["Failed", counts.webhook_failed], ["DLQ entries", counts.dlq_total], ["Open DLQ", counts.dlq_open]] as const).map(([l, v]) => (
          <Card key={l} className="p-4"><div className="text-xs uppercase text-muted-foreground">{l}</div><div className="text-3xl font-bold mt-1">{v}</div></Card>
        ))}
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhook events</TabsTrigger>
          <TabsTrigger value="dlq">Dead-letter queue</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search provider, event type, id" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{["all","pending","processed","failed","retry","dead"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          </div>
          <Card className="p-0 overflow-hidden">
            {loading && webhooks.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              : filteredWebhooks.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No webhook events match.</div>
              : <div className="divide-y max-h-[640px] overflow-auto">{filteredWebhooks.map((w, idx) => (
                  <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.005 }} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{w.provider} · {w.event_type ?? "event"}</div>
                      <div className="text-xs text-muted-foreground truncate">{w.event_id} · {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</div>
                      {w.error && <div className="text-xs text-destructive mt-1 truncate">{w.error}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusTone(w.status)}>{w.status}</Badge>
                      {(w.status === "failed" || w.status === "dead") && <Button size="sm" variant="outline" onClick={() => replayWebhook(w.id)}><ListRestart className="w-4 h-4" /></Button>}
                    </div>
                  </motion.div>
                ))}</div>}
          </Card>
        </TabsContent>

        <TabsContent value="dlq" className="space-y-3">
          <Card className="p-0 overflow-hidden">
            {loading && dlq.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              : dlq.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Dead-letter queue is empty.</div>
              : <div className="divide-y max-h-[640px] overflow-auto">{dlq.map((d, idx) => (
                  <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.005 }} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /> {d.job_type}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.source ?? "system"} · attempts {d.attempts} · {formatDistanceToNow(new Date(d.last_attempt_at), { addSuffix: true })}</div>
                      <div className="text-xs text-destructive mt-1 truncate">{d.error_message}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusTone(d.status)}>{d.status}</Badge>
                      {d.status !== "resolved" && <>
                        <Button size="sm" variant="outline" onClick={() => replayDlq(d.id)}><ListRestart className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => resolveDlq(d.id)}><CheckCircle2 className="w-4 h-4" /></Button>
                      </>}
                    </div>
                  </motion.div>
                ))}</div>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WebhookReplayConsole;
