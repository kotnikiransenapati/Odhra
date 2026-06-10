import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { BellRing, Megaphone, Radio, Send, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled" | "failed";
type Broadcast = {
  id: string;
  name: string;
  title: string;
  body: string;
  channel: "in_app" | "push" | "email" | "whatsapp" | "all";
  audience: "all" | "customers" | "vendors" | "admins" | "inactive" | "loyalty" | "custom";
  status: BroadcastStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

const statusTone: Record<BroadcastStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  scheduled: "default",
  sending: "default",
  sent: "outline",
  paused: "secondary",
  cancelled: "secondary",
  failed: "destructive",
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const db = supabase as unknown as Rpc;

export function CustomerBroadcastOrchestrator() {
  const [rows, setRows] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    body: "",
    channel: "in_app" as Broadcast["channel"],
    audience: "all" as Broadcast["audience"],
    scheduled_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("customer_broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Broadcast[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => rows.reduce((acc, r) => {
    acc.total++;
    acc.recipients += r.total_recipients;
    if (r.status === "scheduled" || r.status === "sending") acc.active++;
    if (r.status === "failed") acc.failed++;
    return acc;
  }, { total: 0, active: 0, recipients: 0, failed: 0 }), [rows]);

  const create = async () => {
    if (form.name.trim().length < 3 || form.title.trim().length < 3 || form.body.trim().length < 3) return toast.error("Complete the broadcast content");
    setSubmitting(true);
    const { error } = await db.rpc("admin_create_customer_broadcast", {
      _name: form.name.trim(),
      _title: form.title.trim(),
      _body: form.body.trim(),
      _channel: form.channel,
      _audience: form.audience,
      _scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
      _metadata: { source: "admin_orchestrator" },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Broadcast scheduled");
    setOpen(false);
    setForm({ name: "", title: "", body: "", channel: "in_app", audience: "all", scheduled_at: "" });
    load();
  };

  const processDue = async () => {
    const { error } = await db.rpc("admin_process_due_customer_broadcasts");
    if (error) return toast.error(error.message);
    toast.success("Due broadcasts processed");
    load();
  };

  const cancel = async (id: string) => {
    const reason = window.prompt("Cancellation reason") ?? "Admin requested";
    if (!reason.trim()) return;
    const { error } = await db.rpc("admin_cancel_customer_broadcast", { _id: id, _reason: reason.trim() });
    if (error) return toast.error(error.message);
    toast.success("Broadcast cancelled");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Radio className="w-6 h-6 text-primary" /> Customer Broadcast Orchestrator</h2>
          <p className="text-sm text-muted-foreground mt-1">Schedule segmented in-app broadcasts with backend delivery accounting and audit trails.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={processDue}><Send className="w-4 h-4 mr-1" /> Process Due</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Megaphone className="w-4 h-4 mr-1" /> New Broadcast</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>Schedule broadcast</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} placeholder="Monsoon launch alert" /></div>
                <div><Label>Scheduled at</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                <div><Label>Channel</Label><Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as Broadcast["channel"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["in_app","push","email","whatsapp","all"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Audience</Label><Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Broadcast["audience"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["all","customers","vendors","admins","inactive","loyalty","custom"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder="New arrivals are live" /></div>
                <div className="sm:col-span-2"><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={500} placeholder="Explore curated picks before the sale ends." /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? "Scheduling..." : "Schedule broadcast"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([ ["Total", counts.total], ["Active", counts.active], ["Recipients", counts.recipients], ["Failed", counts.failed] ] as const).map(([label, value]) => <Card key={label} className="p-4"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="text-3xl font-bold mt-1">{value}</div></Card>)}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2"><BellRing className="w-4 h-4" /> Broadcast Queue</div>
        {loading && rows.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No broadcasts scheduled.</div>
          : <div className="divide-y max-h-[720px] overflow-auto">{rows.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <p className="text-sm mt-1 truncate">{r.title}</p>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                    <span>{r.channel}</span><span>·</span><span>{r.audience}</span><span>·</span><span>{r.total_recipients} recipients</span><span>·</span><span>{r.sent_at ? `sent ${formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}` : r.scheduled_at ? formatDistanceToNow(new Date(r.scheduled_at), { addSuffix: true }) : "unscheduled"}</span>
                  </div>
                  {r.scheduled_at && <div className="text-xs text-muted-foreground mt-1">Scheduled {format(new Date(r.scheduled_at), "MMM d, HH:mm")}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusTone[r.status]}>{r.status}</Badge>
                  {(r.status === "draft" || r.status === "scheduled" || r.status === "paused") && <Button size="sm" variant="outline" onClick={() => cancel(r.id)}><XCircle className={cn("w-4 h-4")} /></Button>}
                </div>
              </motion.div>
            ))}</div>}
      </Card>
    </div>
  );
}

export default CustomerBroadcastOrchestrator;