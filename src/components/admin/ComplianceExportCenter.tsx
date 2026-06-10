import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { FileLock2, Plus, RefreshCw, Download, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "pending" | "processing" | "ready" | "failed" | "expired";
type ReqType = "gdpr_sar" | "ccpa" | "internal_audit" | "legal_hold";

type ExportRow = {
  id: string;
  subject_user_id: string;
  subject_email: string | null;
  request_type: ReqType;
  status: Status;
  scopes: string[];
  file_url: string | null;
  file_size_bytes: number | null;
  reason: string | null;
  requested_by: string;
  processed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
};

const tone: Record<Status, BadgeProps["variant"]> = {
  pending: "secondary",
  processing: "default",
  ready: "outline",
  failed: "destructive",
  expired: "outline",
};

const SCOPES = ["profile", "orders", "addresses", "loyalty", "reviews", "support", "wallet", "subscriptions"];
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

export function ComplianceExportCenter() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject_user_id: "",
    request_type: "gdpr_sar" as ReqType,
    scopes: ["profile", "orders", "addresses", "loyalty"] as string[],
    reason: "",
  });
  const rpc = supabase as unknown as Rpc;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc.rpc("admin_list_export_requests", { _limit: 200 });
    if (error) toast.error(error.message);
    setRows((data as ExportRow[]) ?? []);
    setLoading(false);
  }, [rpc]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => rows.reduce((a, r) => {
    a.total++;
    if (r.status === "pending" || r.status === "processing") a.open++;
    if (r.status === "failed") a.failed++;
    if (r.status === "ready") a.ready++;
    return a;
  }, { total: 0, open: 0, failed: 0, ready: 0 }), [rows]);

  const create = async () => {
    if (!/^[0-9a-f-]{36}$/i.test(form.subject_user_id.trim())) return toast.error("Valid subject user UUID required");
    if (form.scopes.length === 0) return toast.error("Select at least one scope");
    setSubmitting(true);
    const { error } = await rpc.rpc("admin_create_export_request", {
      _subject_user_id: form.subject_user_id.trim(),
      _request_type: form.request_type,
      _scopes: form.scopes,
      _reason: form.reason || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Export request opened");
    setOpen(false);
    setForm({ subject_user_id: "", request_type: "gdpr_sar", scopes: ["profile", "orders", "addresses", "loyalty"], reason: "" });
    load();
  };

  const toggleScope = (s: string) =>
    setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileLock2 className="w-6 h-6 text-primary" /> Compliance Export Center</h2>
          <p className="text-sm text-muted-foreground mt-1">Track GDPR / CCPA subject access requests with audit-logged provenance and 7-day expiry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New compliance export</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Subject user ID (UUID)</Label><Input value={form.subject_user_id} onChange={(e) => setForm({ ...form, subject_user_id: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" /></div>
                <div><Label>Type</Label>
                  <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v as ReqType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gdpr_sar">GDPR SAR (Article 15)</SelectItem>
                      <SelectItem value="ccpa">CCPA Right to Know</SelectItem>
                      <SelectItem value="internal_audit">Internal Audit</SelectItem>
                      <SelectItem value="legal_hold">Legal Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scopes</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {SCOPES.map(s => (
                      <button key={s} type="button" onClick={() => toggleScope(s)}
                        className={cn("text-xs px-2 py-1 rounded border transition-colors", form.scopes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}>{s}</button>
                    ))}
                  </div>
                </div>
                <div><Label>Reason / ticket reference</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={500} placeholder="SUP-1234: customer requested data export" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([["Total", counts.total], ["In progress", counts.open], ["Ready", counts.ready], ["Failed", counts.failed]] as const).map(([label, value]) => (
          <Card key={label} className="p-4"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="text-3xl font-bold mt-1">{value}</div></Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Requests</div>
        {loading && rows.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No export requests yet.</div>
          : <div className="divide-y max-h-[640px] overflow-auto">
              {rows.map((r, idx) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                  className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.subject_email ?? r.subject_user_id}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                      <span>{r.request_type}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                      {r.expires_at && <span>· expires {format(new Date(r.expires_at), "MMM d")}</span>}
                      <span className="font-mono">{r.scopes.join(", ")}</span>
                    </div>
                    {r.error_message && <div className="text-xs text-destructive mt-1">{r.error_message}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={tone[r.status]}>{r.status}</Badge>
                    {r.file_url && <Button asChild size="sm" variant="outline"><a href={r.file_url} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-1" /> Download</a></Button>}
                  </div>
                </motion.div>
              ))}
            </div>}
      </Card>
    </div>
  );
}
