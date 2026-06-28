import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface Approval {
  id: string;
  cart_id: string | null;
  account_id: string;
  requested_amount: number;
  credit_limit: number;
  outstanding_balance: number;
  status: string;
  reason: string | null;
  created_at: string;
  account?: { business_name: string; tier: string; contact_email: string } | null;
}

export default function AdminWholesaleApprovals() {
  const [list, setList] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await sb
      .from("wholesale_order_approvals")
      .select("*, account:wholesaler_accounts(business_name,tier,contact_email)")
      .order("created_at", { ascending: false })
      .limit(100);
    setList((data ?? []) as Approval[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (a: Approval, status: "approved" | "rejected") => {
    setBusy(a.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sb
        .from("wholesale_order_approvals")
        .update({
          status,
          reason: reasons[a.id] ?? null,
          decided_by: auth.user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", a.id);
      if (error) throw error;
      if (a.cart_id) {
        await sb
          .from("wholesale_carts")
          .update({ status: status === "approved" ? "approved" : "rejected" })
          .eq("id", a.cart_id);
      }
      toast.success(`Approval ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Wholesale Order Approvals</h2>
        <p className="text-sm text-muted-foreground">Credit-gated wholesale orders awaiting review.</p>
      </div>
      {loading ? (
        <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No approval requests.</Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const avail = a.credit_limit - a.outstanding_balance;
            const over = a.requested_amount > avail;
            return (
              <Card key={a.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.account?.business_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.account?.contact_email} · Tier {a.account?.tier} · {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={a.status === "pending" ? "default" : "outline"}>{a.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Requested" value={`₹${Number(a.requested_amount).toFixed(2)}`} />
                  <Stat label="Credit limit" value={`₹${Number(a.credit_limit).toFixed(2)}`} />
                  <Stat label="Outstanding" value={`₹${Number(a.outstanding_balance).toFixed(2)}`} />
                  <Stat label="Available" value={`₹${avail.toFixed(2)}`} highlight={over ? "danger" : "ok"} />
                </div>
                {a.status === "pending" && (
                  <>
                    <Textarea
                      rows={2}
                      placeholder="Optional note / reason"
                      value={reasons[a.id] ?? ""}
                      onChange={(e) => setReasons({ ...reasons, [a.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => decide(a, "approved")} disabled={busy === a.id}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button variant="destructive" onClick={() => decide(a, "rejected")} disabled={busy === a.id}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </>
                )}
                {a.reason && a.status !== "pending" && (
                  <div className="text-sm text-muted-foreground">Reason: {a.reason}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "danger" | "ok" }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight === "danger" ? "text-rose-600" : highlight === "ok" ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}
