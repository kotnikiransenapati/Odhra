import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Play, Pause, CheckCircle2 } from "lucide-react";

type Variant = { name: string; weight: number };
type Experiment = {
  id: string;
  key: string;
  description: string | null;
  status: "draft" | "running" | "paused" | "completed";
  variants: Variant[];
  primary_metric: string;
  started_at: string | null;
  ended_at: string | null;
};
type Result = {
  experiment_key: string;
  variant: string;
  exposures: number;
  conversions: number;
  conversion_rate_pct: number;
  total_value: number | null;
};

export function ExperimentsConsole() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: "",
    description: "",
    variants: "control:50, variant_a:50",
    primary_metric: "conversion",
  });

  async function load() {
    const [{ data: exps }, { data: res }] = await Promise.all([
      (supabase.from as any)("experiments").select("*").order("created_at", { ascending: false }),
      (supabase.from as any)("experiment_results").select("*"),
    ]);
    setExperiments((exps as Experiment[]) ?? []);
    setResults((res as Result[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createExperiment() {
    const variants = form.variants.split(",").map(s => {
      const [name, weight] = s.split(":").map(p => p.trim());
      return { name, weight: Number(weight) || 1 };
    }).filter(v => v.name);
    if (variants.length < 2) {
      toast.error("Need at least 2 variants (format: name:weight, name:weight)");
      return;
    }
    const { error } = await (supabase.from as any)("experiments").insert({
      key: form.key.trim(),
      description: form.description || null,
      variants,
      primary_metric: form.primary_metric,
      status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Experiment created");
    setCreating(false);
    setForm({ key: "", description: "", variants: "control:50, variant_a:50", primary_metric: "conversion" });
    load();
  }

  async function setStatus(exp: Experiment, status: Experiment["status"]) {
    const patch: any = { status };
    if (status === "running" && !exp.started_at) patch.started_at = new Date().toISOString();
    if (status === "completed") patch.ended_at = new Date().toISOString();
    const { error } = await (supabase.from as any)("experiments").update(patch).eq("id", exp.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const resultsFor = (key: string) => results.filter(r => r.experiment_key === key);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Experiments</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Multivariate tests with weighted variants and live conversion tracking.
          </p>
        </div>
        <Button onClick={() => setCreating(c => !c)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {creating && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Key</Label>
                <Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })}
                  placeholder="hero_cta_color" />
              </div>
              <div>
                <Label>Primary metric</Label>
                <Input value={form.primary_metric}
                  onChange={e => setForm({ ...form, primary_metric: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Variants (name:weight, ...)</Label>
              <Input value={form.variants}
                onChange={e => setForm({ ...form, variants: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={createExperiment} size="sm">Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {experiments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No experiments yet.</p>
        )}

        {experiments.map(exp => {
          const rs = resultsFor(exp.key);
          return (
            <div key={exp.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{exp.key}</h3>
                    <Badge variant={exp.status === "running" ? "default" : "secondary"}>
                      {exp.status}
                    </Badge>
                  </div>
                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Select value={exp.status} onValueChange={(v) => setStatus(exp, v as any)}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {exp.variants.map(v => {
                  const r = rs.find(x => x.variant === v.name);
                  const winning = rs.length > 1 && r &&
                    r.conversion_rate_pct === Math.max(...rs.map(x => x.conversion_rate_pct));
                  return (
                    <div key={v.name} className={`rounded-md border p-3 ${winning ? "border-primary bg-primary/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{v.name}</span>
                        <span className="text-xs text-muted-foreground">w {v.weight}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Exposures</div>
                          <div className="font-semibold">{r?.exposures ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Conv.</div>
                          <div className="font-semibold">{r?.conversions ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Rate</div>
                          <div className="font-semibold">{r?.conversion_rate_pct ?? 0}%</div>
                        </div>
                      </div>
                      {winning && (
                        <Badge variant="outline" className="mt-2 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Leading
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default ExperimentsConsole;
