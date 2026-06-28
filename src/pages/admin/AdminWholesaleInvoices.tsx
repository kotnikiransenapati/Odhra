import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, CheckCircle2, FileText, IndianRupee } from "lucide-react";

interface AdminInvoice {
  id: string;
  invoice_number: string;
  wholesaler_id: string;
  billing_name: string;
  grand_total: number;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string;
  issue_date: string;
}

interface AdminPayment {
  id: string;
  wholesaler_id: string;
  invoice_id: string | null;
  amount: number;
  mode: string;
  reference_number: string | null;
  payment_date: string;
  verified: boolean;
  notes: string | null;
}

interface WholesalerLite {
  id: string;
  business_name: string;
  gstin: string | null;
  billing_address: any;
  credit_limit: number;
  current_outstanding: number;
}

const fmt = (n: number) =>
  `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function AdminWholesaleInvoices() {
  const [tab, setTab] = useState<"invoices" | "payments" | "create">("invoices");
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [wholesalers, setWholesalers] = useState<WholesalerLite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [invRes, payRes, whRes] = await Promise.all([
      supabase
        .from("wholesale_invoices" as any)
        .select("*")
        .order("issue_date", { ascending: false })
        .limit(200),
      supabase
        .from("wholesale_payments" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("wholesaler_accounts" as any)
        .select("id,business_name,gstin,billing_address,credit_limit,current_outstanding")
        .eq("status", "approved")
        .order("business_name"),
    ]);
    setInvoices((invRes.data as any) ?? []);
    setPayments((payRes.data as any) ?? []);
    setWholesalers((whRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const verifyPayment = async (id: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("wholesale_payments" as any)
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: auth.user?.id ?? null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Payment verified");
      refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Wholesale Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Issue GST invoices, verify payments, and reconcile accounts.
          </p>
        </div>
        <div className="flex gap-1">
          {(["invoices", "payments", "create"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
              className="capitalize"
            >
              {t === "create" ? (
                <>
                  <Plus className="h-4 w-4 mr-1" /> New invoice
                </>
              ) : (
                t
              )}
            </Button>
          ))}
        </div>
      </div>

      {tab === "invoices" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Invoice #</th>
                  <th className="text-left p-3">Party</th>
                  <th className="text-left p-3">Issue</th>
                  <th className="text-left p-3">Due</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Paid</th>
                  <th className="text-right p-3">Due</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" /> No invoices yet
                    </td>
                  </tr>
                ) : (
                  invoices.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="p-3 font-medium">{i.invoice_number}</td>
                      <td className="p-3">{i.billing_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(i.issue_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(i.due_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-semibold">{fmt(i.grand_total)}</td>
                      <td className="p-3 text-right">{fmt(i.amount_paid)}</td>
                      <td className="p-3 text-right">{fmt(i.amount_due)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "payments" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No payments recorded
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">
                        {new Date(p.payment_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 capitalize">{p.mode.replace("_", " ")}</td>
                      <td className="p-3 font-mono text-xs">{p.reference_number ?? "—"}</td>
                      <td className="p-3 text-right font-semibold">{fmt(p.amount)}</td>
                      <td className="p-3">
                        {p.verified ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!p.verified && (
                          <Button size="sm" onClick={() => verifyPayment(p.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "create" && (
        <CreateInvoiceForm
          wholesalers={wholesalers}
          onCreated={() => {
            refresh();
            setTab("invoices");
          }}
        />
      )}
    </div>
  );
}

interface Line {
  description: string;
  hsn_code: string;
  quantity: number;
  rate: number;
  gst_pct: number;
}

function CreateInvoiceForm({
  wholesalers,
  onCreated,
}: {
  wholesalers: WholesalerLite[];
  onCreated: () => void;
}) {
  const [wholesalerId, setWholesalerId] = useState("");
  const [dueDays, setDueDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [intraState, setIntraState] = useState(true);
  const [lines, setLines] = useState<Line[]>([
    { description: "", hsn_code: "", quantity: 1, rate: 0, gst_pct: 18 },
  ]);
  const [saving, setSaving] = useState(false);

  const wholesaler = wholesalers.find((w) => w.id === wholesalerId);

  const totals = lines.reduce(
    (acc, l) => {
      const taxable = l.quantity * l.rate;
      const tax = (taxable * l.gst_pct) / 100;
      acc.subtotal += taxable;
      acc.tax += tax;
      if (intraState) {
        acc.cgst += tax / 2;
        acc.sgst += tax / 2;
      } else {
        acc.igst += tax;
      }
      acc.total += taxable + tax;
      return acc;
    },
    { subtotal: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  const updateLine = (idx: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const create = async () => {
    if (!wholesaler) {
      toast.error("Select a wholesaler");
      return;
    }
    if (lines.some((l) => !l.description || l.quantity <= 0 || l.rate <= 0)) {
      toast.error("Fill all line items with valid qty & rate");
      return;
    }
    setSaving(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc(
        "generate_wholesale_invoice_number" as any
      );
      if (numErr) throw numErr;
      const invoice_number = numData as unknown as string;

      const issue_date = new Date().toISOString().slice(0, 10);
      const due = new Date();
      due.setDate(due.getDate() + dueDays);
      const due_date = due.toISOString().slice(0, 10);

      const { data: inv, error: invErr } = await supabase
        .from("wholesale_invoices" as any)
        .insert({
          invoice_number,
          wholesaler_id: wholesaler.id,
          billing_name: wholesaler.business_name,
          billing_gstin: wholesaler.gstin,
          billing_address: wholesaler.billing_address ?? {},
          shipping_address: wholesaler.billing_address ?? {},
          subtotal: totals.subtotal,
          cgst_total: totals.cgst,
          sgst_total: totals.sgst,
          igst_total: totals.igst,
          tax_total: totals.tax,
          grand_total: totals.total,
          amount_due: totals.total,
          due_date,
          issue_date,
          status: "issued",
          notes: notes || null,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      const itemRows = lines.map((l) => {
        const taxable = l.quantity * l.rate;
        const tax = (taxable * l.gst_pct) / 100;
        return {
          invoice_id: (inv as any).id,
          description: l.description,
          hsn_code: l.hsn_code || null,
          quantity: l.quantity,
          rate: l.rate,
          taxable_value: taxable,
          gst_pct: l.gst_pct,
          cgst: intraState ? tax / 2 : 0,
          sgst: intraState ? tax / 2 : 0,
          igst: intraState ? 0 : tax,
          line_total: taxable + tax,
        };
      });
      const { error: itemErr } = await supabase
        .from("wholesale_invoice_items" as any)
        .insert(itemRows);
      if (itemErr) throw itemErr;

      toast.success(`Invoice ${invoice_number} created`);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label>Wholesaler</Label>
          <select
            value={wholesalerId}
            onChange={(e) => setWholesalerId(e.target.value)}
            className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select a wholesaler…</option>
            {wholesalers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.business_name} {w.gstin ? `(${w.gstin})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Payment terms (days)</Label>
          <Input
            type="number"
            value={dueDays}
            onChange={(e) => setDueDays(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-3 flex items-center gap-2 text-sm">
          <input
            id="intra"
            type="checkbox"
            checked={intraState}
            onChange={(e) => setIntraState(e.target.checked)}
          />
          <label htmlFor="intra">Intra-state (CGST + SGST). Uncheck for IGST.</label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setLines([
                ...lines,
                { description: "", hsn_code: "", quantity: 1, rate: 0, gst_pct: 18 },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2 w-24">HSN</th>
                <th className="text-right p-2 w-20">Qty</th>
                <th className="text-right p-2 w-28">Rate</th>
                <th className="text-right p-2 w-20">GST%</th>
                <th className="text-right p-2 w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const lt = l.quantity * l.rate * (1 + l.gst_pct / 100);
                return (
                  <tr key={i} className="border-t">
                    <td className="p-1">
                      <Input
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        placeholder="Product/service"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        value={l.hsn_code}
                        onChange={(e) => updateLine(i, { hsn_code: e.target.value })}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number"
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="text-right"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number"
                        value={l.rate}
                        onChange={(e) =>
                          updateLine(i, { rate: parseFloat(e.target.value) || 0 })
                        }
                        className="text-right"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number"
                        value={l.gst_pct}
                        onChange={(e) =>
                          updateLine(i, { gst_pct: parseFloat(e.target.value) || 0 })
                        }
                        className="text-right"
                      />
                    </td>
                    <td className="p-1 text-right font-medium">{fmt(lt)}</td>
                    <td className="p-1 text-center">
                      {lines.length > 1 && (
                        <button
                          onClick={() => setLines(lines.filter((_, j) => j !== i))}
                          className="text-red-600 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="PO number, delivery instructions, terms…"
            className="mt-1"
          />
        </div>
        <Card className="p-4 bg-muted/30">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <IndianRupee className="h-4 w-4" /> Summary
          </h4>
          <Row k="Subtotal" v={fmt(totals.subtotal)} />
          {intraState ? (
            <>
              <Row k="CGST" v={fmt(totals.cgst)} />
              <Row k="SGST" v={fmt(totals.sgst)} />
            </>
          ) : (
            <Row k="IGST" v={fmt(totals.igst)} />
          )}
          <Row k="Grand total" v={fmt(totals.total)} bold />
          {wholesaler && (
            <p className="text-xs text-muted-foreground mt-2">
              Current outstanding: {fmt(wholesaler.current_outstanding ?? 0)} /
              limit {fmt(wholesaler.credit_limit)}
            </p>
          )}
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={create} disabled={saving || !wholesalerId}>
          {saving ? "Creating…" : "Create & issue invoice"}
        </Button>
      </div>
    </Card>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm py-1 ${bold ? "font-semibold border-t mt-1 pt-2" : ""}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
