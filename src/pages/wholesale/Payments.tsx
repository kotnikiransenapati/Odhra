import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWholesaler } from "@/hooks/useWholesaler";
import {
  useWholesaleBilling,
  submitWholesalePayment,
} from "@/hooks/useWholesaleBilling";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock, CreditCard } from "lucide-react";

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const MODES = [
  { value: "bank_transfer", label: "Bank transfer (NEFT/RTGS)" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online (Razorpay)" },
  { value: "cash", label: "Cash" },
];

export default function WholesalePayments() {
  const { account } = useWholesaler();
  const { loading, payments, invoices, summary, refresh } =
    useWholesaleBilling(account?.id);
  const [searchParams] = useSearchParams();
  const initialInvoice = searchParams.get("invoice") ?? "";

  const [invoiceId, setInvoiceId] = useState<string>(initialInvoice);
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<string>("bank_transfer");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.amount_due > 0 && i.status !== "void"),
    [invoices]
  );

  useEffect(() => {
    if (initialInvoice) {
      const inv = invoices.find((i) => i.id === initialInvoice);
      if (inv) setAmount(String(inv.amount_due));
    }
  }, [initialInvoice, invoices]);

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) setAmount(String(inv.amount_due));
  };

  const submit = async () => {
    if (!account?.id) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (mode !== "cash" && !reference.trim()) {
      toast.error("Reference / transaction number is required");
      return;
    }
    setSubmitting(true);
    try {
      await submitWholesalePayment({
        wholesaler_id: account.id,
        invoice_id: invoiceId || null,
        amount: amt,
        mode,
        reference_number: reference || undefined,
        notes: notes || undefined,
      });
      toast.success("Payment submitted — awaiting verification");
      setAmount("");
      setReference("");
      setNotes("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Billing</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record offline payments (NEFT/UPI/cheque). Verified payments auto-reconcile to your invoices.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Record a payment</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Apply to invoice (optional)</Label>
              <select
                value={invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">— On account / advance —</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_number} · due {fmt(i.amount_due)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Mode</Label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Reference / UTR / Cheque no.</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR2024010012345"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bank, branch, any remarks"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Submitted payments are <span className="font-medium">pending verification</span> by accounts team.
              You'll be notified once verified (usually within 1 business day).
            </p>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit payment"}
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Account summary</h2>
          <Row label="Outstanding" value={fmt(summary.outstanding)} />
          <Row label="Overdue" value={fmt(summary.overdue)} accent={summary.overdue > 0} />
          <Row
            label="Available credit"
            value={fmt(
              Math.max((account?.credit_limit ?? 0) - summary.outstanding, 0)
            )}
          />
          <Row label="Credit terms" value={`${account?.credit_days ?? account?.payment_terms_days ?? 0} days`} />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Payment history</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Mode</th>
                  <th className="text-left p-2">Reference</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                    <td className="p-2 capitalize">{p.mode.replace("_", " ")}</td>
                    <td className="p-2 font-mono text-xs">{p.reference_number ?? "—"}</td>
                    <td className="p-2 text-right font-semibold">{fmt(p.amount)}</td>
                    <td className="p-2">
                      {p.verified ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
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

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${accent ? "text-red-600" : ""}`}>{value}</span>
    </div>
  );
}
