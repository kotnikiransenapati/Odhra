import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  grand_total: number;
  customer_notes: string | null;
  admin_notes: string | null;
  valid_until: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  responded: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  expired: "bg-zinc-200 text-zinc-700",
  converted: "bg-violet-100 text-violet-800",
};

export default function WholesaleQuotes() {
  const [list, setList] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    const { data } = await sb
      .from("wholesale_quotes")
      .select("id,quote_number,status,grand_total,customer_notes,admin_notes,valid_until,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    setList((data ?? []) as Quote[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createRfq = async () => {
    if (!notes.trim()) {
      toast.error("Add a short request description");
      return;
    }
    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: acc } = await sb
        .from("wholesaler_accounts").select("id").eq("user_id", auth.user.id).maybeSingle();
      const { error } = await sb.from("wholesale_quotes").insert({
        user_id: auth.user.id,
        account_id: acc?.id ?? null,
        status: "submitted",
        customer_notes: notes,
      });
      if (error) throw error;
      toast.success("RFQ submitted");
      setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit RFQ");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quotes (RFQ)</h1>

      <Card className="p-4 space-y-3">
        <div className="font-semibold">New request for quote</div>
        <Textarea
          rows={4}
          placeholder="Describe products, expected quantity, target price, delivery timeline…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button onClick={createRfq} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Submit RFQ
        </Button>
      </Card>

      {loading ? (
        <div className="py-12 grid place-items-center"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No quotes yet.</Card>
      ) : (
        <div className="space-y-2">
          {list.map((q) => (
            <Card key={q.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="font-semibold">{q.quote_number}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(q.created_at).toLocaleString()}
                  {q.valid_until ? ` · valid until ${q.valid_until}` : ""}
                </div>
                {q.customer_notes && <div className="text-sm mt-1 max-w-xl">{q.customer_notes}</div>}
                {q.admin_notes && (
                  <div className="text-sm mt-1 max-w-xl text-emerald-700">
                    <strong>Response:</strong> {q.admin_notes}
                  </div>
                )}
              </div>
              <div className="text-right">
                <Badge className={STATUS_COLORS[q.status] ?? ""}>{q.status}</Badge>
                {q.grand_total > 0 && (
                  <div className="font-bold mt-1">₹{Number(q.grand_total).toFixed(2)}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
