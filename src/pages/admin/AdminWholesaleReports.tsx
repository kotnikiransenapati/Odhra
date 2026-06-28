import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, Download, RefreshCw, Activity } from "lucide-react";

interface AgingRow {
  account_id: string;
  business_name: string;
  tier: string;
  outstanding: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

interface SloRow {
  id: string;
  captured_at: string;
  apply_to_approve_p50_hours: number | null;
  apply_to_approve_p95_hours: number | null;
  order_to_invoice_p50_hours: number | null;
  order_to_invoice_p95_hours: number | null;
  invoice_to_paid_p50_days: number | null;
  invoice_to_paid_p95_days: number | null;
  sample_size: number;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function AdminWholesaleReports() {
  const [aging, setAging] = useState<AgingRow[]>([]);
  const [slos, setSlos] = useState<SloRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: a, error: ae }, { data: s }] = await Promise.all([
      supabase.rpc("wholesale_ar_aging_report" as any),
      supabase
        .from("wholesale_slo_snapshots" as any)
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(10),
    ]);
    if (ae) toast.error(ae.message);
    setAging((a as any) ?? []);
    setSlos(((s as any) ?? []) as SloRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recompute = async () => {
    setRecomputing(true);
    const { error } = await supabase.rpc("wholesale_slo_compute" as any);
    setRecomputing(false);
    if (error) return toast.error(error.message);
    toast.success("SLO snapshot recomputed");
    load();
  };

  const exportCsv = () => {
    const header = ["Account", "Tier", "Outstanding", "0-30", "31-60", "61-90", "90+"];
    const rows = aging.map((r) => [
      r.business_name,
      r.tier,
      r.outstanding,
      r.bucket_0_30,
      r.bucket_31_60,
      r.bucket_61_90,
      r.bucket_90_plus,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wholesale-ar-aging-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = aging.reduce(
    (acc, r) => {
      acc.outstanding += Number(r.outstanding) || 0;
      acc.b1 += Number(r.bucket_0_30) || 0;
      acc.b2 += Number(r.bucket_31_60) || 0;
      acc.b3 += Number(r.bucket_61_90) || 0;
      acc.b4 += Number(r.bucket_90_plus) || 0;
      return acc;
    },
    { outstanding: 0, b1: 0, b2: 0, b3: 0, b4: 0 },
  );

  const latestSlo = slos[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Wholesale Reports
          </h1>
          <p className="text-sm text-muted-foreground">AR aging across all approved B2B accounts and journey SLOs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={aging.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={recompute} disabled={recomputing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${recomputing ? "animate-spin" : ""}`} /> Recompute SLO
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> Journey SLOs (last 90d)
          </div>
          {latestSlo && (
            <Badge variant="outline" className="text-xs">
              {new Date(latestSlo.captured_at).toLocaleString()}
            </Badge>
          )}
        </div>
        {!latestSlo ? (
          <div className="text-sm text-muted-foreground">No snapshot yet — click "Recompute SLO".</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <SloStat label="Apply → Approve" p50={latestSlo.apply_to_approve_p50_hours} p95={latestSlo.apply_to_approve_p95_hours} unit="h" />
            <SloStat label="Order → Invoice" p50={latestSlo.order_to_invoice_p50_hours} p95={latestSlo.order_to_invoice_p95_hours} unit="h" />
            <SloStat label="Invoice → Paid" p50={latestSlo.invoice_to_paid_p50_days} p95={latestSlo.invoice_to_paid_p95_days} unit="d" />
          </div>
        )}
        {latestSlo && <div className="text-xs text-muted-foreground">Sample size: {latestSlo.sample_size}</div>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">AR Aging Summary</div>
          <div className="text-sm text-muted-foreground">{aging.length} accounts with balances</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <KPI label="Total outstanding" value={inr(totals.outstanding)} />
          <KPI label="0-30 days" value={inr(totals.b1)} />
          <KPI label="31-60 days" value={inr(totals.b2)} />
          <KPI label="61-90 days" value={inr(totals.b3)} tone="warn" />
          <KPI label="90+ days" value={inr(totals.b4)} tone="danger" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-2">Account</th>
                <th className="py-2 px-2">Tier</th>
                <th className="py-2 px-2 text-right">Outstanding</th>
                <th className="py-2 px-2 text-right">0-30</th>
                <th className="py-2 px-2 text-right">31-60</th>
                <th className="py-2 px-2 text-right">61-90</th>
                <th className="py-2 px-2 text-right">90+</th>
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
              {!loading && aging.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No outstanding balances.
                  </td>
                </tr>
              )}
              {aging.map((r) => (
                <tr key={r.account_id}>
                  <td className="py-2 pr-2 font-medium">{r.business_name}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline">{r.tier}</Badge>
                  </td>
                  <td className="py-2 px-2 text-right font-semibold">{inr(Number(r.outstanding))}</td>
                  <td className="py-2 px-2 text-right">{inr(Number(r.bucket_0_30))}</td>
                  <td className="py-2 px-2 text-right">{inr(Number(r.bucket_31_60))}</td>
                  <td className="py-2 px-2 text-right text-amber-600">{inr(Number(r.bucket_61_90))}</td>
                  <td className="py-2 px-2 text-right text-destructive">{inr(Number(r.bucket_90_plus))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${cls}`}>{value}</div>
    </Card>
  );
}

function SloStat({ label, p50, p95, unit }: { label: string; p50: number | null; p95: number | null; unit: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">
        p50 {p50 ?? 0}
        {unit} · p95 {p95 ?? 0}
        {unit}
      </div>
    </div>
  );
}
