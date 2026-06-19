import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Calculator, RefreshCw, FileCheck, Filter, Lock } from 'lucide-react';

type Report = {
  id: string;
  vendor_id: string;
  period_month: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  order_count: number;
  status: 'draft' | 'finalized' | 'filed';
  filed_reference: string | null;
  computed_at: string;
};

const fmtINR = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
const monthVal = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const statusColor = (s: string) => ({
  draft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  finalized: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  filed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
}[s] || 'bg-muted');

export function VendorTaxReportsManager() {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVendor, setFilterVendor] = useState('');
  const [genVendor, setGenVendor] = useState('');
  const [genMonth, setGenMonth] = useState(monthVal(new Date()));
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_tax_reports_list', {
        _vendor_id: filterVendor.trim() || null,
        _limit: 200,
      });
      if (error) throw error;
      setRows((data as Report[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  }, [filterVendor]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!genVendor.trim()) { toast.error('Vendor ID required'); return; }
    setWorking(true);
    try {
      const { error } = await supabase.rpc('generate_vendor_tax_report', {
        _vendor_id: genVendor.trim(),
        _month: `${genMonth}-01`,
      });
      if (error) throw error;
      toast.success('Report generated');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setWorking(false); }
  };

  const finalize = async (id: string) => {
    const ref = window.prompt('Optional filing reference (leave blank to just finalize):') ?? '';
    try {
      const { error } = await supabase.rpc('admin_finalize_tax_report', {
        _id: id, _filed_reference: ref.trim() || null,
      });
      if (error) throw error;
      toast.success(ref.trim() ? 'Marked as filed' : 'Finalized');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6" /> Vendor Tax (GST) Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly aggregated CGST / SGST / IGST per vendor with finalize/file workflow.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate Monthly Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Vendor ID</Label>
            <Input value={genVendor} onChange={(e) => setGenVendor(e.target.value)} className="w-72" />
          </div>
          <div>
            <Label className="text-xs">Month</Label>
            <Input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="w-44" />
          </div>
          <Button onClick={generate} disabled={working}>{working ? 'Computing…' : 'Generate'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Vendor ID (leave blank for all)"
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="max-w-md"
          />
          <Button variant="outline" onClick={load}>Apply</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No reports</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {rows.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColor(r.status)}>{r.status}</Badge>
                      <span className="font-medium">{fmtMonth(r.period_month)}</span>
                      <code className="text-xs text-muted-foreground">vendor {r.vendor_id.slice(0, 8)}…</code>
                      <Badge variant="outline">{r.order_count} orders</Badge>
                      {r.filed_reference && <Badge variant="secondary">Ref: {r.filed_reference}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                      <div><div className="text-muted-foreground">Taxable</div><div className="font-medium">{fmtINR(r.taxable_amount)}</div></div>
                      <div><div className="text-muted-foreground">CGST</div><div className="font-medium">{fmtINR(r.cgst_amount)}</div></div>
                      <div><div className="text-muted-foreground">SGST</div><div className="font-medium">{fmtINR(r.sgst_amount)}</div></div>
                      <div><div className="text-muted-foreground">IGST</div><div className="font-medium">{fmtINR(r.igst_amount)}</div></div>
                      <div><div className="text-muted-foreground">Total Tax</div><div className="font-medium">{fmtINR(r.total_tax)}</div></div>
                      <div className="col-span-2 sm:col-span-3"><div className="text-muted-foreground">Gross</div><div className="font-medium">{fmtINR(r.total_amount)}</div></div>
                    </div>
                  </div>
                  {r.status !== 'filed' && (
                    <Button size="sm" variant="outline" onClick={() => finalize(r.id)} className="gap-1">
                      {r.status === 'draft' ? <FileCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {r.status === 'draft' ? 'Finalize / File' : 'Mark Filed'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default VendorTaxReportsManager;
