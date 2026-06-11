import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, RefreshCw, XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Stats = { pending: number; approved: number; denied: number; expired: number; executed: number };
type Row = {
  id: string; action_type: string; description: string | null; payload: any;
  requested_by: string; status: string; reviewed_by: string | null;
  reviewed_at: string | null; review_notes: string | null;
  expires_at: string; created_at: string;
};

export function AdminApprovalQueue() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<{ row: Row; approve: boolean } | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const [s, q] = await Promise.all([
      supabase.rpc("admin_approvals_stats" as any),
      supabase.from("admin_action_approvals" as any).select("*")
        .order("created_at", { ascending: false }).limit(150),
    ]);
    if (s.error) toast({ title: "Stats failed", description: s.error.message, variant: "destructive" });
    setStats((s.data as Stats) || null);
    setRows(((q.data as unknown) as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const decide = async () => {
    if (!reviewing) return;
    const { error } = await supabase.rpc("admin_decide_approval" as any, {
      _id: reviewing.row.id, _approve: reviewing.approve, _notes: notes || null,
    });
    if (error) return toast({ title: "Decision failed", description: error.message, variant: "destructive" });
    toast({ title: reviewing.approve ? "Approved" : "Denied" });
    setReviewing(null); setNotes(""); load();
  };

  const visible = filter === "pending" ? rows.filter(r => r.status === "pending") : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Admin Action Approvals</h1>
          <p className="text-muted-foreground">Four-eyes approval queue for high-risk admin actions. Requester cannot self-approve.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-background border rounded-md px-3 text-sm h-9"
            value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="pending">Pending only</option>
            <option value="all">All</option>
          </select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: "Pending", v: stats?.pending ?? "—", warn: (stats?.pending ?? 0) > 0 },
          { l: "Approved", v: stats?.approved ?? "—" },
          { l: "Denied", v: stats?.denied ?? "—" },
          { l: "Expired", v: stats?.expired ?? "—" },
          { l: "Executed", v: stats?.executed ?? "—" },
        ].map(t => (
          <Card key={t.l}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.l}</p>
            <p className={`text-2xl font-bold mt-1 ${t.warn ? "text-warning" : ""}`}>{loading ? "…" : String(t.v)}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Queue</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>
            : visible.length === 0 ? <p className="text-sm text-muted-foreground py-4">No items.</p>
            : <div className="space-y-2 max-h-[560px] overflow-y-auto">
                {visible.map(r => {
                  const statusVariant: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
                    pending: "secondary", approved: "default", denied: "destructive", expired: "outline", executed: "default",
                  };
                  const expSoon = r.status === "pending" && new Date(r.expires_at).getTime() - Date.now() < 4 * 3600 * 1000;
                  return (
                    <div key={r.id} className="p-3 rounded border hover:bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={statusVariant[r.status] || "outline"}>{r.status.toUpperCase()}</Badge>
                            <code className="text-xs font-medium">{r.action_type}</code>
                            {expSoon && <Badge variant="destructive" className="text-xs">expires soon</Badge>}
                          </div>
                          {r.description && <p className="text-sm mt-1">{r.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            requested {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            {r.reviewed_at && ` · reviewed ${formatDistanceToNow(new Date(r.reviewed_at), { addSuffix: true })}`}
                          </p>
                          {r.review_notes && <p className="text-xs italic text-muted-foreground mt-1">"{r.review_notes}"</p>}
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => { setReviewing({ row: r, approve: true }); setNotes(""); }}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setReviewing({ row: r, approve: false }); setNotes(""); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1 text-destructive" /> Deny
                            </Button>
                          </div>
                        )}
                      </div>
                      {r.payload && Object.keys(r.payload).length > 0 && (
                        <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32">{JSON.stringify(r.payload, null, 2)}</pre>
                      )}
                    </div>
                  );
                })}
              </div>}
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reviewing?.approve ? "Approve" : "Deny"} action</DialogTitle></DialogHeader>
          {reviewing && (
            <div className="space-y-3">
              <p className="text-sm"><code className="text-xs">{reviewing.row.action_type}</code></p>
              {reviewing.row.description && <p className="text-sm text-muted-foreground">{reviewing.row.description}</p>}
              <Textarea placeholder="Review notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button variant={reviewing?.approve ? "default" : "destructive"} onClick={decide}>
              Confirm {reviewing?.approve ? "approve" : "deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminApprovalQueue;
