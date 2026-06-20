import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { applyMerchandising, fetchActiveRules, type MerchScope, type MerchandisingRule } from "@/lib/merchandising";
import { ArrowDown, ArrowUp, EyeOff, Pin, Sparkles, Play, GitCompare } from "lucide-react";

type Product = { id: string; title: string; price: number; avg_rating: number | null; view_count: number | null };

const SCOPES: MerchScope[] = ["global", "category", "collection", "search", "vendor", "segment"];

export const MerchandisingSandbox: React.FC = () => {
  const [scope, setScope] = useState<MerchScope>("global");
  const [scopeValue, setScopeValue] = useState("");
  const [baseline, setBaseline] = useState<Product[]>([]);
  const [rules, setRules] = useState<MerchandisingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setHasRun(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select("id, title, price, avg_rating, view_count")
        .eq("is_active", true)
        .order("view_count", { ascending: false, nullsFirst: false })
        .limit(40);
      setBaseline((products ?? []) as Product[]);
      const activeRules = await fetchActiveRules(scope, scope === "global" ? null : scopeValue || null);
      setRules(activeRules);
    } finally {
      setLoading(false);
    }
  };

  const applied = useMemo(() => applyMerchandising(baseline, rules), [baseline, rules]);

  const diff = useMemo(() => {
    const baselineIdx = new Map(baseline.map((p, i) => [p.id, i]));
    return applied.map((p, i) => {
      const wasAt = baselineIdx.get(p.id) ?? -1;
      const delta = wasAt < 0 ? null : wasAt - i;
      const ruleHit = rules.find((r) => r.product_ids?.includes(p.id));
      return { product: p, from: wasAt, to: i, delta, action: ruleHit?.action ?? null };
    });
  }, [baseline, applied, rules]);

  const hiddenIds = useMemo(() => {
    const visible = new Set(applied.map((p) => p.id));
    return baseline.filter((p) => !visible.has(p.id));
  }, [baseline, applied]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" /> Merchandising sandbox</CardTitle>
        <CardDescription>Preview how active rules reshape product ordering before they ship.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Scope</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as MerchScope)}
            >
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {scope !== "global" && (
            <div className="md:col-span-2">
              <Label>Scope value</Label>
              <Input value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder={`${scope} id or slug`} />
            </div>
          )}
        </div>
        <Button onClick={runPreview} disabled={loading}>
          <Play className="w-4 h-4 mr-2" /> Run preview
        </Button>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {!loading && hasRun && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline"><Sparkles className="w-3 h-3 mr-1" />{rules.length} rules</Badge>
              <Badge variant="outline">{baseline.length} baseline</Badge>
              <Badge variant="outline">{applied.length} after rules</Badge>
              {hiddenIds.length > 0 && <Badge variant="destructive">{hiddenIds.length} hidden</Badge>}
            </div>

            <div className="rounded-md border divide-y max-h-[480px] overflow-auto">
              {diff.map((row, i) => {
                const Δ = row.delta ?? 0;
                return (
                  <div key={row.product.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-8 text-muted-foreground tabular-nums">#{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{row.product.title}</span>
                    {row.action === "pin" && <Badge><Pin className="w-3 h-3 mr-1" />pinned</Badge>}
                    {row.action === "boost" && <Badge variant="secondary">boost ×{rules.find(r => r.product_ids?.includes(row.product.id))?.weight ?? 1}</Badge>}
                    {row.action === "bury" && <Badge variant="outline">buried</Badge>}
                    {row.from < 0 ? (
                      <Badge variant="outline">new</Badge>
                    ) : Δ > 0 ? (
                      <span className="text-emerald-600 inline-flex items-center text-xs"><ArrowUp className="w-3 h-3" />{Δ}</span>
                    ) : Δ < 0 ? (
                      <span className="text-amber-600 inline-flex items-center text-xs"><ArrowDown className="w-3 h-3" />{Math.abs(Δ)}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                );
              })}
              {hiddenIds.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm opacity-60">
                  <span className="w-8"><EyeOff className="w-4 h-4" /></span>
                  <span className="flex-1 truncate line-through">{p.title}</span>
                  <Badge variant="destructive">removed</Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MerchandisingSandbox;
