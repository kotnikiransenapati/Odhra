import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarRange, FileBarChart2, Play, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Report = {
  id: string;
  name: string;
  report_type: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  format: "pdf" | "csv" | "xlsx" | "json";
  filters: Record<string, unknown> | null;
  recipients: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
};

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const db = supabase as unknown as Rpc;

export function ScheduledReportsBuilder() {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    report_type: "orders_summary",
    frequency: "weekly" as Report["frequency"],
    format: "pdf" as Report["format"],
    recipients: "",
    next_run_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("scheduled_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Report[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => rows.reduce((acc, r) => {
    acc.total++;
    if (r.is_active) acc.active++;
    if (r.next_run_at && new Date(r.next_run_at) <= new Date()) acc.due++;
    return acc;
  }, { total: 0, active: 0, due: 0 }), [rows]);

  const create = async () => {
    const recipients = form.recipients.split(",").map(s => s.trim()).filter(Boolean);
    if (form.name.trim().length < 3) return toast.error("Name too short");
    if (recipients.length === 0) return toast.error("Add at least one recipient email");
    setSubmitting(true);
    const { error } = await db.rpc("admin_schedule_report", {
      _name: form.name.trim(),
      _report_type: form.report_type,
      _frequency: form.frequency,
      _format: form.format,
      _recipients: recipients,
      _filters: {},
      _next_run_at: form.next_run_at ? new Date(form.next_run_at).toISOString() : null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Report scheduled");
    setOpen(false);
    setForm({ name: "", report_type: "orders_summary", frequency: "weekly", format: "pdf", recipients: "", next_run_at: "" });
    load();
  };

  const toggle = async (r: Report) => {
    const { error } = await db.rpc("admin_toggle_scheduled_report", { _id: r.id, _active: !r.is_active });
    if (error) return toast.error(error.message);
    toast.success(r.is_active ? "Paused" : "Activated");
    load();
  };

  const remove = async (r: Report) => {
    if (!window.confirm(`Delete "${r.name}"?`)) return;
    const { error } = await db.rpc("admin_delete_scheduled_report", { _id: r.id });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const processDue = async () => {
    const { error } = await db.rpc("admin_process_due_scheduled_reports");
    if (error) return toast.error(error.message);
    toast.success("Due reports processed");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileBarChart2 className="w-6 h-6 text-primary" /> Scheduled Reports Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">Automate recurring KPI reports with multi-recipient delivery and audit history.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={processDue}><Play className="w-4 h-4 mr-1" /> Process Due</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><CalendarRange className="w-4 h-4 mr-1" /> New Report</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>Schedule report</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} placeholder="Weekly orders digest" /></div>
                <div><Label>Report type</Label><Select value={form.report_type} onValueChange={(v) => setForm({ ...form, report_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["orders_summary","revenue_breakdown","vendor_performance","inventory_status","customer_cohorts","support_sla"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Frequency</Label><Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Report["frequency"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["daily","weekly","monthly","quarterly"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Format</Label><Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as Report["format"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pdf","csv","xlsx","json"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>First run at</Label><Input type="datetime-local" value={form.next_run_at} onChange={(e) => setForm({ ...form, next_run_at: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Recipients (comma separated emails)</Label><Input value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="ops@brand.com, finance@brand.com" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? "Scheduling..." : "Schedule"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([["Total", counts.total], ["Active", counts.active], ["Due", counts.due]] as const).map(([l, v]) => (
          <Card key={l} className="p-4"><div className="text-xs uppercase text-muted-foreground">{l}</div><div className="text-3xl font-bold mt-1">{v}</div></Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Schedule Queue</div>
        {loading && rows.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No scheduled reports yet.</div>
          : <div className="divide-y max-h-[720px] overflow-auto">{rows.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                    <span>{r.report_type}</span><span>·</span><span>{r.frequency}</span><span>·</span><span>{r.format.toUpperCase()}</span><span>·</span><span>{r.recipients.length} recipients</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.next_run_at ? `next ${format(new Date(r.next_run_at), "MMM d, HH:mm")} (${formatDistanceToNow(new Date(r.next_run_at), { addSuffix: true })})` : "no schedule"}
                    {r.last_sent_at ? ` · last sent ${formatDistanceToNow(new Date(r.last_sent_at), { addSuffix: true })}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "active" : "paused"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggle(r)}><Power className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            ))}</div>}
      </Card>
    </div>
  );
}

export default ScheduledReportsBuilder;
