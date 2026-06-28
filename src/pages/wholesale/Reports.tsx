import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function WholesaleReports() {
  const { account } = useWholesaler();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("wholesale_invoices" as any)
        .select("id, invoice_number, issue_date, due_date, grand_total, amount_paid, amount_due, status")
        .eq("wholesaler_id", account.id)
        .order("issue_date", { ascending: false });
      setInvoices(((data as any) ?? []) as InvoiceRow[]);
      setLoading(false);
    })();
  }, [account?.id]);

  const today = new Date();
  const aging = invoices.reduce(
    (acc, i) => {
      if (!["issued", "partially_paid", "overdue"].includes(i.status)) return acc;
      const days = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86_400_000);
      const v = Number(i.amount_due) || 0;
      if (days <= 30) acc.b1 += v;
      else if (days <= 60) acc.b2 += v;
      else if (days <= 90) acc.b3 += v;
      else acc.b4 += v;
      acc.outstanding += v;
      return acc;
    },
    { outstanding: 0, b1: 0, b2: 0, b3: 0, b4: 0 },
  );

  const lifetime = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
  const paid = invoices.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);

  const exportCsv = () => {
    const header = ["Invoice", "Issue date", "Due date", "Total", "Paid", "Due", "Status"];
    const rows = invoices.map((i) => [i.invoice_number, i.issue_date, i.due_date, i.grand_total, i.amount_paid, i.amount_due, i.status]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `account-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Reports & Statement
          </h1>
          <p className="text-sm text-muted-foreground">Account aging summary and full statement.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={invoices.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Lifetime billed" value={inr(lifetime)} />
        <KPI label="Paid to date" value={inr(paid)} />
        <KPI label="Outstanding" value={inr(aging.outstanding)} />
        <KPI label="Credit limit" value={inr(Number(account?.credit_limit) || 0)} />
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3">AR Aging</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <AgingCell label="0-30" value={aging.b1} />
          <AgingCell label="31-60" value={aging.b2} />
          <AgingCell label="61-90" value={aging.b3} warn />
          <AgingCell label="90+" value={aging.b4} danger />
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-semibold mb-3">Statement</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 px-2">Issued</th>
                <th className="py-2 px-2">Due</th>
                <th className="py-2 px-2 text-right">Total</th>
                <th className="py-2 px-2 text-right">Paid</th>
                <th className="py-2 px-2 text-right">Due</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No invoices yet.
                  </td>
                </tr>
              )}
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-2 font-medium">{i.invoice_number}</td>
                  <td className="py-2 px-2">{new Date(i.issue_date).toLocaleDateString()}</td>
                  <td className="py-2 px-2">{new Date(i.due_date).toLocaleDateString()}</td>
                  <td className="py-2 px-2 text-right">{inr(Number(i.grand_total))}</td>
                  <td className="py-2 px-2 text-right">{inr(Number(i.amount_paid))}</td>
                  <td className="py-2 px-2 text-right">{inr(Number(i.amount_due))}</td>
                  <td className="py-2 px-2">
                    <Badge variant={i.status === "overdue" ? "destructive" : "outline"} className="capitalize">
                      {i.status.replace("_", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </Card>
  );
}

function AgingCell({ label, value, warn, danger }: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  const cls = danger ? "border-destructive/40 bg-destructive/5 text-destructive" : warn ? "border-amber-300 bg-amber-50 text-amber-700" : "";
  return (
    <div className={`rounded border p-3 ${cls}`}>
      <div className="text-xs opacity-80">{label} days</div>
      <div className="font-semibold">{inr(value)}</div>
    </div>
  );
}
