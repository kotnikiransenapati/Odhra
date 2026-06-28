import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  campaign: string;
  source: string;
  medium: string;
  first_touch_revenue: number;
  last_touch_revenue: number;
  linear_revenue: number;
  conversions: number;
};

export function AttributionDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("compute_order_attribution", { _lookback_days: Number(days) })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setRows(data as Row[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days]);

  const fmt = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Multi-Touch Attribution</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue attributed across first-touch, last-touch, and linear models.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No attributed conversions in this window yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Source / Medium</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">First Touch</TableHead>
                  <TableHead className="text-right">Last Touch</TableHead>
                  <TableHead className="text-right">Linear</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.campaign}</TableCell>
                    <TableCell className="text-muted-foreground">{r.source} / {r.medium}</TableCell>
                    <TableCell className="text-right">{r.conversions}</TableCell>
                    <TableCell className="text-right">{fmt(r.first_touch_revenue)}</TableCell>
                    <TableCell className="text-right">{fmt(r.last_touch_revenue)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.linear_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AttributionDashboard;
