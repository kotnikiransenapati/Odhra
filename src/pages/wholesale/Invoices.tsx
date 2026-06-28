import { useMemo, useState } from "react";
import { useWholesaler } from "@/hooks/useWholesaler";
import { useWholesaleBilling, type WholesaleInvoice } from "@/hooks/useWholesaleBilling";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ExternalLink, Receipt, Search, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const statusVariant: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  issued: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  overdue: "bg-red-500/10 text-red-700 border-red-500/30",
  draft: "bg-muted text-muted-foreground",
  void: "bg-muted text-muted-foreground line-through",
};

export default function WholesaleInvoices() {
  const { account } = useWholesaler();
  const { loading, invoices, summary } = useWholesaleBilling(account?.id);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const matchesStatus = status === "all" || i.status === status;
      const matchesQ =
        !q.trim() ||
        i.invoice_number.toLowerCase().includes(q.toLowerCase()) ||
        i.billing_name.toLowerCase().includes(q.toLowerCase());
      return matchesStatus && matchesQ;
    });
  }, [invoices, q, status]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Billing</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Invoices & Statements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GST-compliant invoices. Download PDFs, track due dates, and settle outstanding balances.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total outstanding" value={fmt(summary.outstanding)} />
        <StatCard
          label="Overdue"
          value={fmt(summary.overdue)}
          highlight={summary.overdue > 0}
        />
        <StatCard label="Open invoices" value={String(summary.invoice_count)} />
        <StatCard label="Overdue invoices" value={String(summary.overdue_count)} />
      </div>

      {summary.overdue > 0 && (
        <Card className="p-4 border-red-500/40 bg-red-500/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-red-700">
              You have {fmt(summary.overdue)} overdue across {summary.overdue_count} invoice(s).
            </div>
            <div className="text-muted-foreground mt-0.5">
              Settle overdue invoices to keep credit limits and dispatch SLAs active.
            </div>
          </div>
          <Button asChild size="sm" variant="default">
            <Link to="/wholesale/payments">Pay now</Link>
          </Button>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice no. or party"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {["all", "issued", "partial", "overdue", "paid", "void"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatus(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No invoices match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Invoice #</th>
                  <th className="text-left p-3">Issue date</th>
                  <th className="text-left p-3">Due date</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Due</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: WholesaleInvoice }) {
  const isOverdue =
    inv.status !== "paid" &&
    inv.status !== "void" &&
    new Date(inv.due_date) < new Date() &&
    inv.amount_due > 0;
  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-3 font-medium">{inv.invoice_number}</td>
      <td className="p-3 text-muted-foreground">
        {new Date(inv.issue_date).toLocaleDateString("en-IN")}
      </td>
      <td className={`p-3 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
        {new Date(inv.due_date).toLocaleDateString("en-IN")}
      </td>
      <td className="p-3 text-right font-semibold">{fmt(inv.grand_total)}</td>
      <td className="p-3 text-right">{fmt(inv.amount_due)}</td>
      <td className="p-3">
        <Badge variant="outline" className={statusVariant[inv.status] ?? ""}>
          {inv.status}
        </Badge>
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1">
          {inv.pdf_url && (
            <Button asChild size="sm" variant="outline">
              <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          {inv.amount_due > 0 && (
            <Button asChild size="sm" variant="default">
              <Link to={`/wholesale/payments?invoice=${inv.id}`}>
                Pay <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-red-500/40 bg-red-500/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${highlight ? "text-red-700" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
