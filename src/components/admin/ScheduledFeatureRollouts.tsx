import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarClock, RotateCcw, ShieldCheck, ToggleLeft, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Flag = { id: string; feature_key: string; feature_name: string; is_enabled: boolean; category: string };
type RolloutStatus = "draft" | "scheduled" | "running" | "completed" | "cancelled" | "rolled_back" | "failed";
type Rollout = {
  id: string;
  feature_flag_id: string;
  rollout_name: string;
  target_state: boolean;
  audience: "all" | "customers" | "vendors" | "admins" | "staff" | "beta";
  rollout_percentage: number;
  status: RolloutStatus;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  rollback_reason: string | null;
  safety_threshold: Record<string, unknown>;
  metrics_snapshot: Record<string, unknown>;
  notes: string | null;
  created_at: string;
};

const statusTone: Record<RolloutStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  scheduled: "default",
  running: "default",
  completed: "outline",
  cancelled: "secondary",
  rolled_back: "destructive",
  failed: "destructive",
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const db = supabase as unknown as Rpc;

export function ScheduledFeatureRollouts() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [rollouts, setRollouts] = useState<Rollout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    feature_flag_id: "",
    rollout_name: "",
    target_state: true,
    audience: "all" as Rollout["audience"],
    rollout_percentage: 100,
    scheduled_at: "",
    notes: "",
    max_error_rate: 5,
    max_p95_latency_ms: 3000,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [flagRes, rolloutRes] = await Promise.all([
      (supabase as any).from("feature_flags").select("id,feature_key,feature_name,is_enabled,category").order("category", { ascending: true }),
      (supabase as any).from("feature_flag_rollouts").select("*").order("scheduled_at", { ascending: false }).limit(100),
    ]);
    if (flagRes.error) toast.error(flagRes.error.message);
    if (rolloutRes.error) toast.error(rolloutRes.error.message);
    setFlags((flagRes.data ?? []) as Flag[]);
    setRollouts((rolloutRes.data ?? []) as Rollout[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => rollouts.reduce((acc, r) => {
    acc.total++;
    if (r.status === "scheduled" || r.status === "running") acc.active++;
    if (r.status === "completed") acc.completed++;
    if (r.status === "failed" || r.status === "rolled_back") acc.risk++;
    return acc;
  }, { total: 0, active: 0, completed: 0, risk: 0 }), [rollouts]);

  const create = async () => {
    if (!form.feature_flag_id) return toast.error("Select a feature flag");
    if (form.rollout_name.trim().length < 3) return toast.error("Rollout name required");
    setSubmitting(true);
    const { error } = await db.rpc("admin_schedule_feature_rollout", {
      _feature_flag_id: form.feature_flag_id,
      _rollout_name: form.rollout_name.trim(),
      _target_state: form.target_state,
      _audience: form.audience,
      _rollout_percentage: form.rollout_percentage,
      _scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
      _safety_threshold: { max_error_rate: form.max_error_rate, max_p95_latency_ms: form.max_p95_latency_ms },
      _notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Rollout scheduled");
    setOpen(false);
    setForm({ feature_flag_id: "", rollout_name: "", target_state: true, audience: "all", rollout_percentage: 100, scheduled_at: "", notes: "", max_error_rate: 5, max_p95_latency_ms: 3000 });
    load();
  };

  const processDue = async () => {
    const { error } = await db.rpc("admin_process_due_feature_rollouts");
    if (error) return toast.error(error.message);
    toast.success("Due rollouts processed");
    load();
  };

  const cancel = async (id: string, completed: boolean) => {
    const reason = window.prompt(completed ? "Rollback reason" : "Cancellation reason") ?? "Admin requested";
    if (!reason.trim()) return;
    const { error } = await db.rpc("admin_cancel_feature_rollout", { _id: id, _reason: reason.trim() });
    if (error) return toast.error(error.message);
    toast.success(completed ? "Rollout marked for rollback" : "Rollout cancelled");
    load();
  };

  const flagById = useMemo(() => new Map(flags.map(f => [f.id, f])), [flags]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6 text-primary" /> Scheduled Feature Rollouts</h2>
          <p className="text-sm text-muted-foreground mt-1">Stage feature flags by audience and percentage with audit-logged safety metadata.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={processDue}><Zap className="w-4 h-4 mr-1" /> Process Due</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><ToggleLeft className="w-4 h-4 mr-1" /> Schedule</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>Schedule rollout</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Feature</Label><Select value={form.feature_flag_id} onValueChange={(v) => setForm({ ...form, feature_flag_id: v })}><SelectTrigger><SelectValue placeholder="Choose feature" /></SelectTrigger><SelectContent>{flags.map(f => <SelectItem key={f.id} value={f.id}>{f.feature_name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Name</Label><Input value={form.rollout_name} onChange={(e) => setForm({ ...form, rollout_name: e.target.value })} maxLength={120} placeholder="Beta checkout ramp" /></div>
                <div><Label>Audience</Label><Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Rollout["audience"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["all","customers","vendors","admins","staff","beta"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Percentage</Label><Input type="number" min={0} max={100} value={form.rollout_percentage} onChange={(e) => setForm({ ...form, rollout_percentage: Number(e.target.value) })} /></div>
                <div><Label>Scheduled at</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                <div><Label>Max error rate %</Label><Input type="number" min={0} value={form.max_error_rate} onChange={(e) => setForm({ ...form, max_error_rate: Number(e.target.value) })} /></div>
                <div><Label>Max p95 latency ms</Label><Input type="number" min={0} value={form.max_p95_latency_ms} onChange={(e) => setForm({ ...form, max_p95_latency_ms: Number(e.target.value) })} /></div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3"><div><Label>Target state</Label><p className="text-xs text-muted-foreground">Enable or disable when the rollout runs.</p></div><Switch checked={form.target_state} onCheckedChange={(v) => setForm({ ...form, target_state: v })} /></div>
                <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? "Scheduling..." : "Schedule rollout"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([ ["Total", counts.total], ["Active", counts.active], ["Completed", counts.completed], ["Risk", counts.risk] ] as const).map(([label, value]) => <Card key={label} className="p-4"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="text-3xl font-bold mt-1">{value}</div></Card>)}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Rollout Queue</div>
        {loading && rollouts.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : rollouts.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No scheduled rollouts.</div>
          : <div className="divide-y max-h-[720px] overflow-auto">{rollouts.map((r, idx) => {
              const flag = flagById.get(r.feature_flag_id);
              return <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.rollout_name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                    <span>{flag?.feature_name ?? r.feature_flag_id}</span><span>·</span><span>{r.target_state ? "enable" : "disable"}</span><span>·</span><span>{r.audience} / {r.rollout_percentage}%</span><span>·</span><span>{formatDistanceToNow(new Date(r.scheduled_at), { addSuffix: true })}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Scheduled {format(new Date(r.scheduled_at), "MMM d, HH:mm")}</div>
                  {r.rollback_reason && <div className="text-xs text-destructive mt-1">{r.rollback_reason}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusTone[r.status]}>{r.status}</Badge>
                  {(r.status === "scheduled" || r.status === "running" || r.status === "completed") && <Button size="sm" variant="outline" onClick={() => cancel(r.id, r.status === "completed")}><RotateCcw className={cn("w-4 h-4", r.status !== "completed" && "rotate-45")} /></Button>}
                </div>
              </motion.div>;
            })}</div>}
      </Card>
    </div>
  );
}

export default ScheduledFeatureRollouts;