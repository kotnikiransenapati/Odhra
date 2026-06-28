import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, PauseCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string; user_id: string; business_name: string; gstin: string | null;
  contact_phone: string; contact_email: string; status: string; tier: string;
  credit_limit: number; created_at: string; rejection_reason: string | null;
}

const STATUSES = ["pending", "under_review", "approved", "rejected", "suspended"];

export default function AdminWholesalers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("wholesaler_accounts" as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [status]);

  const filtered = rows.filter((r) =>
    !q ? true : (r.business_name + r.contact_email + r.contact_phone + (r.gstin ?? "")).toLowerCase().includes(q.toLowerCase())
  );

  const updateStatus = async (r: Row, next: string, reason?: string) => {
    setBusyId(r.id);
    const patch: any = { status: next };
    if (next === "rejected") patch.rejection_reason = reason ?? null;
    if (next === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from("wholesaler_accounts" as any).update(patch).eq("id", r.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${next.replace("_", " ")}`);
    load();
  };

  const setCredit = async (r: Row) => {
    const raw = prompt(`Set credit limit (₹) for ${r.business_name}`, String(r.credit_limit ?? 0));
    if (raw == null) return;
    const value = Number(raw.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(value) || value < 0) return toast.error("Invalid amount");
    const { error } = await supabase.from("wholesaler_accounts" as any).update({ credit_limit: value }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Credit limit updated");
    load();
  };

  const setTier = async (r: Row) => {
    const tier = prompt("Tier (standard / silver / gold / platinum)", r.tier || "standard");
    if (!tier) return;
    const { error } = await supabase.from("wholesaler_accounts" as any).update({ tier: tier.toLowerCase() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Tier updated");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Wholesaler Accounts</h2>
          <p className="text-sm text-muted-foreground">Approve B2B applications, set credit, manage tiers.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Status</Label>
            <select
              className="block mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="w-64">
            <Label className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Business, email, GSTIN" />
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No accounts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Business</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">GSTIN</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-right p-3">Credit</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium">{r.business_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3">
                      <div>{r.contact_email}</div>
                      <div className="text-xs text-muted-foreground">{r.contact_phone}</div>
                    </td>
                    <td className="p-3">{r.gstin || "—"}</td>
                    <td className="p-3">
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" || r.status === "suspended" ? "destructive" : "secondary"}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <button className="underline-offset-2 hover:underline capitalize" onClick={() => setTier(r)}>{r.tier}</button>
                    </td>
                    <td className="p-3 text-right">
                      <button className="underline-offset-2 hover:underline" onClick={() => setCredit(r)}>
                        ₹{Number(r.credit_limit ?? 0).toLocaleString("en-IN")}
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="sm" variant="outline" disabled={busyId === r.id || r.status === "approved"} onClick={() => updateStatus(r, "approved")}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === r.id || r.status === "rejected"} onClick={() => {
                        const reason = prompt("Reason for rejection?") ?? undefined;
                        if (reason !== undefined) updateStatus(r, "rejected", reason);
                      }}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === r.id || r.status === "suspended"} onClick={() => updateStatus(r, "suspended")}>
                        <PauseCircle className="h-3.5 w-3.5 mr-1" /> Suspend
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
