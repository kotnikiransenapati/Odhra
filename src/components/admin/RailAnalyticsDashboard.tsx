import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, BarChart3, Wand2, Eye } from "lucide-react";

interface CTRRow {
  rail_key: string;
  product_id: string | null;
  rule_id: string | null;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  ctr: number;
}

interface Proposal {
  rule_id: string;
  name: string;
  action: string;
  impressions: number;
  clicks: number;
  ctr: number;
  weight_current: number;
  weight_proposed: number;
}

export const RailAnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [alpha, setAlpha] = useState(0.4);
  const [ctr, setCtr] = useState<CTRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [targetCtr, setTargetCtr] = useState(0);
  const [tuning, setTuning] = useState(false);

  const loadCtr = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("rail_ctr_summary", { _days: days });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else setCtr((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { loadCtr(); }, [days]);

  const previewTune = async (apply = false) => {
    setTuning(true);
    try {
      const { data, error } = await supabase.functions.invoke("tune-merchandising-weights", {
        body: { days, alpha, apply },
      });
      if (error) throw error;
      setProposals(data.proposals ?? []);
      setTargetCtr(data.target_ctr ?? 0);
      toast({
        title: apply ? `Applied ${data.proposals?.length ?? 0} weight updates` : `Generated ${data.proposals?.length ?? 0} proposals`,
      });
      if (apply) loadCtr();
    } catch (e: any) {
      toast({ title: "Tuner failed", description: e.message, variant: "destructive" });
    } finally {
      setTuning(false);
    }
  };

  const railSummary = Object.values(
    ctr.reduce((acc: Record<string, { rail: string; impressions: number; clicks: number }>, r) => {
      const k = r.rail_key;
      acc[k] = acc[k] ?? { rail: k, impressions: 0, clicks: 0 };
      acc[k].impressions += Number(r.impressions);
      acc[k].clicks += Number(r.clicks);
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Rail performance</CardTitle>
          <CardDescription>Impressions, clicks, and CTR per personalized rail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Window (days)</Label>
              <Input type="number" min={1} max={90} className="w-24" value={days} onChange={(e) => setDays(Number(e.target.value) || 7)} />
            </div>
            <Button variant="outline" onClick={loadCtr}>Refresh</Button>
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {railSummary.map((r) => {
                const ctrPct = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(2) : "0.00";
                return (
                  <div key={r.rail} className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.rail}</p>
                    <p className="text-2xl font-semibold mt-1">{ctrPct}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.clicks} / {r.impressions} clicks/views</p>
                  </div>
                );
              })}
              {railSummary.length === 0 && <p className="text-sm text-muted-foreground">No interactions yet in this window.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5" /> Auto-tune rule weights</CardTitle>
          <CardDescription>
            Adjusts each merchandising rule's weight toward the global CTR target using gradient α.
            Target CTR: <Badge variant="secondary">{(targetCtr * 100).toFixed(2)}%</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Learning rate α</Label>
              <Input type="number" step="0.05" min={0.05} max={1} className="w-24" value={alpha} onChange={(e) => setAlpha(Number(e.target.value) || 0.4)} />
            </div>
            <Button onClick={() => previewTune(false)} disabled={tuning} variant="outline">
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button onClick={() => previewTune(true)} disabled={tuning || proposals.length === 0}>
              <Wand2 className="w-4 h-4 mr-2" /> Apply {proposals.length} update{proposals.length === 1 ? "" : "s"}
            </Button>
          </div>

          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proposals — preview first, or insufficient signal (need ≥50 impressions per rule).</p>
          ) : (
            <div className="rounded-md border divide-y">
              {proposals.map((p) => {
                const up = p.weight_proposed > p.weight_current;
                return (
                  <div key={p.rule_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                    <Badge variant="outline">{p.action}</Badge>
                    <Badge variant="outline">{(p.ctr * 100).toFixed(2)}% CTR</Badge>
                    <Badge variant="outline">{p.impressions} imp</Badge>
                    <span className="tabular-nums">{p.weight_current.toFixed(2)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className={`tabular-nums font-semibold ${up ? "text-emerald-600" : "text-amber-600"}`}>
                      {p.weight_proposed.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RailAnalyticsDashboard;
