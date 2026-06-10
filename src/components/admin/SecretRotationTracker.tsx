import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Key, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Secret = {
  id: string;
  name: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  rotation_interval_days: number;
  last_rotated_at: string | null;
  rotation_count: number;
  owner_email: string | null;
  notes: string | null;
  days_since_rotated: number | null;
  days_until_due: number | null;
  status: "ok" | "due_soon" | "overdue" | "never_rotated";
};

const STATUS: Record<Secret["status"], { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  ok:             { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "OK" },
  due_soon:       { icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     label: "Due Soon" },
  overdue:        { icon: AlertTriangle, color: "text-red-600",     bg: "bg-red-50 border-red-200",         label: "Overdue" },
  never_rotated:  { icon: ShieldAlert,   color: "text-red-700",     bg: "bg-red-50 border-red-300",         label: "Never Rotated" },
};

export function SecretRotationTracker() {
  const [rows, setRows] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Secret | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_secrets_status");
    if (!error && Array.isArray(data)) setRows(data as Secret[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRotated = async () => {
    if (!picked) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("admin_mark_secret_rotated", {
      _name: picked.name,
      _note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(`${picked.name} marked rotated`);
    setPicked(null);
    setNote("");
    load();
  };

  const summary = rows.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Secret Rotation Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Audit and schedule rotations for API keys, tokens, and signing secrets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["ok","due_soon","overdue","never_rotated"] as const).map((k) => {
          const s = STATUS[k]; const Icon = s.icon;
          return (
            <Card key={k} className={cn("p-4 border", s.bg)}>
              <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <Icon className={cn("w-4 h-4", s.color)} /> {s.label}
              </div>
              <div className={cn("text-3xl font-bold mt-1", s.color)}>{summary[k] ?? 0}</div>
            </Card>
          );
        })}
      </div>

      {loading && rows.length === 0 ? (
        <div className="grid gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Secret</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-left px-3 py-3">Severity</th>
                <th className="text-left px-3 py-3">Last Rotated</th>
                <th className="text-right px-3 py-3">Interval</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATUS[r.status]; const Icon = s.icon;
                return (
                  <motion.tr key={r.id} className="border-t" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                    <td className="px-3 py-3 capitalize">{r.category}</td>
                    <td className="px-3 py-3">
                      <Badge variant={r.severity === "critical" ? "destructive" : "secondary"} className="capitalize">
                        {r.severity}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {r.last_rotated_at
                        ? `${formatDistanceToNow(new Date(r.last_rotated_at), { addSuffix: true })} (${r.rotation_count}×)`
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-3 tabular-nums">{r.rotation_interval_days}d</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", s.color)}>
                        <Icon className="w-3.5 h-3.5" /> {s.label}
                        {r.days_until_due != null && r.days_until_due < 0 && (
                          <span className="opacity-80">({Math.abs(r.days_until_due)}d over)</span>
                        )}
                      </span>
                    </td>
                    <td className="text-right px-3 py-3">
                      <Button size="sm" variant="outline" onClick={() => setPicked(r)}>
                        Mark rotated
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark <span className="font-mono">{picked?.name}</span> rotated</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Records the rotation timestamp and writes an audit log. Make sure the new secret is deployed before confirming.
            </p>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Rotated after employee offboarding"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={markRotated} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm rotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
