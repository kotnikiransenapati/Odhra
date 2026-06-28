import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Budget = {
  id: string;
  code: string;
  daily_limit: number | null;
  total_limit: number | null;
  period_start: string;
  spent_today: number;
  spent_total: number;
};

export function PromoBudgetGovernor() {
  const [rows, setRows] = useState<Budget[]>([]);
  const [form, setForm] = useState({ code: "", daily: "", total: "" });

  async function load() {
    const { data } = await (supabase.from as any)("promo_budgets")
      .select("*").order("code");
    setRows((data as Budget[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.code.trim()) return;
    const { error } = await (supabase.from as any)("promo_budgets").insert({
      code: form.code.trim().toUpperCase(),
      daily_limit: form.daily ? Number(form.daily) : null,
      total_limit: form.total ? Number(form.total) : null,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ code: "", daily: "", total: "" });
    toast.success("Budget configured");
    load();
  }

  async function remove(id: string) {
    const { error } = await (supabase.from as any)("promo_budgets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const pct = (s: number, l: number | null) =>
    l && l > 0 ? Math.min(100, Math.round((s / l) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo Budget Governor</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cap daily and lifetime spend per promo code. Checkout auto-refuses codes that would
          exceed the configured budget.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-4 gap-2 items-end border rounded-lg p-3 bg-muted/30">
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              placeholder="WELCOME10" />
          </div>
          <div>
            <Label>Daily limit (₹)</Label>
            <Input type="number" value={form.daily}
              onChange={e => setForm({ ...form, daily: e.target.value })} />
          </div>
          <div>
            <Label>Total limit (₹)</Label>
            <Input type="number" value={form.total}
              onChange={e => setForm({ ...form, total: e.target.value })} />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No budgets configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead>Lifetime</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.code}</TableCell>
                    <TableCell className="w-1/3">
                      <div className="text-xs mb-1">
                        ₹{Math.round(b.spent_today).toLocaleString("en-IN")}
                        {b.daily_limit ? ` / ₹${b.daily_limit.toLocaleString("en-IN")}` : " (uncapped)"}
                      </div>
                      <Progress value={pct(b.spent_today, b.daily_limit)} />
                    </TableCell>
                    <TableCell className="w-1/3">
                      <div className="text-xs mb-1">
                        ₹{Math.round(b.spent_total).toLocaleString("en-IN")}
                        {b.total_limit ? ` / ₹${b.total_limit.toLocaleString("en-IN")}` : " (uncapped)"}
                      </div>
                      <Progress value={pct(b.spent_total, b.total_limit)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => remove(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

export default PromoBudgetGovernor;
