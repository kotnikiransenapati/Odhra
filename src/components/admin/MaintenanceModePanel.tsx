import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wrench, RefreshCw, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

type Window = {
  id: string;
  scope: string;
  reason: string;
  allow_admins: boolean;
  starts_at: string;
  ends_at: string | null;
};

export function MaintenanceModePanel() {
  const [rows, setRows] = useState<Window[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scope: "global", reason: "", allow_admins: true, ends_at: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("maintenance_windows")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as Window[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const active = rows.filter((r) => {
    const now = Date.now();
    return new Date(r.starts_at).getTime() <= now &&
      (!r.ends_at || new Date(r.ends_at).getTime() > now);
  });

  const submit = async () => {
    if (!form.reason.trim()) return toast.error("Reason is required");
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("admin_start_maintenance", {
      _scope: form.scope.trim() || "global",
      _reason: form.reason.trim(),
      _allow_admins: form.allow_admins,
      _ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Maintenance window started");
    setOpen(false);
    setForm({ scope: "global", reason: "", allow_admins: true, ends_at: "" });
    load();
  };

  const end = async (id: string) => {
    const { error } = await (supabase as any).rpc("admin_end_maintenance", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Maintenance ended");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Maintenance Mode
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gate edge functions and surfaces during deployments or incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Start Maintenance</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start Maintenance Window</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Scope</Label>
                  <Input
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    placeholder="global or service name (e.g. create-razorpay-order)"
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Deploying payments hotfix — back in 15 min"
                  />
                </div>
                <div>
                  <Label>Ends at (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Allow admins through</Label>
                  <Switch
                    checked={form.allow_admins}
                    onCheckedChange={(v) => setForm({ ...form, allow_admins: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? "Starting..." : "Start"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {active.length > 0 && (
        <Card className="p-4 border-red-300 bg-red-50">
          <div className="text-sm font-semibold text-red-700 mb-2">
            {active.length} active window{active.length > 1 ? "s" : ""}
          </div>
          <div className="space-y-2">
            {active.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{w.reason}</div>
                  <div className="text-xs text-red-700/80">
                    {w.scope} · started {formatDistanceToNow(new Date(w.starts_at), { addSuffix: true })}
                    {w.ends_at && ` · ends ${formatDistanceToNow(new Date(w.ends_at), { addSuffix: true })}`}
                  </div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => end(w.id)}>
                  <X className="w-4 h-4 mr-1" /> End now
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No maintenance windows recorded yet.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Scope</th>
                <th className="text-left px-3 py-3">Reason</th>
                <th className="text-left px-3 py-3">Window</th>
                <th className="text-left px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const now = Date.now();
                const isActive = new Date(w.starts_at).getTime() <= now &&
                  (!w.ends_at || new Date(w.ends_at).getTime() > now);
                return (
                  <motion.tr key={w.id} className="border-t" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="px-4 py-2 font-mono text-xs">{w.scope}</td>
                    <td className="px-3 py-2 max-w-md truncate">{w.reason}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {format(new Date(w.starts_at), "MMM d, HH:mm")} →{" "}
                      {w.ends_at ? format(new Date(w.ends_at), "MMM d, HH:mm") : "open"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={isActive ? "destructive" : "secondary"}>
                        {isActive ? "Active" : "Ended"}
                      </Badge>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
