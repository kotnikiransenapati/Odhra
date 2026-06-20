import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pin, TrendingUp, ArrowDown, EyeOff, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MerchAction, MerchScope, MerchandisingRule } from "@/lib/merchandising";

const ACTION_META: Record<MerchAction, { label: string; icon: React.ElementType; variant: any }> = {
  pin: { label: "Pin to top", icon: Pin, variant: "default" },
  boost: { label: "Boost ranking", icon: TrendingUp, variant: "secondary" },
  bury: { label: "Bury", icon: ArrowDown, variant: "outline" },
  hide: { label: "Hide", icon: EyeOff, variant: "destructive" },
};

const SCOPES: MerchScope[] = ["global", "category", "collection", "search", "vendor", "segment"];

export const MerchandisingRulesManager: React.FC = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<MerchandisingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<MerchandisingRule>>({
    name: "",
    scope_type: "global",
    action: "boost",
    product_ids: [],
    weight: 1,
    priority: 100,
    is_active: true,
  });
  const [productIdsRaw, setProductIdsRaw] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("merchandising_rules")
      .select("*")
      .order("priority", { ascending: true });
    if (error) toast({ title: "Failed to load rules", description: error.message, variant: "destructive" });
    else setRules((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRule = async () => {
    if (!draft.name) return toast({ title: "Name required", variant: "destructive" });
    const ids = productIdsRaw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return toast({ title: "Add at least one product ID", variant: "destructive" });

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("merchandising_rules").insert({
      name: draft.name!,
      description: draft.description ?? null,
      scope_type: draft.scope_type!,
      scope_value: draft.scope_value ?? null,
      action: draft.action!,
      product_ids: ids,
      weight: Number(draft.weight) || 1,
      priority: Number(draft.priority) || 100,
      is_active: draft.is_active ?? true,
      starts_at: draft.starts_at ?? null,
      ends_at: draft.ends_at ?? null,
      created_by: user?.id,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Rule created" });
    setDraft({ name: "", scope_type: "global", action: "boost", product_ids: [], weight: 1, priority: 100, is_active: true });
    setProductIdsRaw("");
    load();
  };

  const toggleActive = async (rule: MerchandisingRule) => {
    await supabase.from("merchandising_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("merchandising_rules").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create merchandising rule</CardTitle>
          <CardDescription>Pin, boost, bury or hide products across catalog surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Summer hero pins" />
          </div>
          <div>
            <Label>Scope</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={draft.scope_type}
              onChange={(e) => setDraft({ ...draft, scope_type: e.target.value as MerchScope })}
            >
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {draft.scope_type !== "global" && (
            <div>
              <Label>Scope value ({draft.scope_type} id/slug)</Label>
              <Input value={draft.scope_value ?? ""} onChange={(e) => setDraft({ ...draft, scope_value: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Action</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={draft.action}
              onChange={(e) => setDraft({ ...draft, action: e.target.value as MerchAction })}
            >
              {(Object.keys(ACTION_META) as MerchAction[]).map((a) => <option key={a} value={a}>{ACTION_META[a].label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Product IDs (comma or newline separated)</Label>
            <Textarea rows={3} value={productIdsRaw} onChange={(e) => setProductIdsRaw(e.target.value)} placeholder="uuid1, uuid2, uuid3" />
          </div>
          <div>
            <Label>Weight</Label>
            <Input type="number" step="0.1" value={draft.weight ?? 1} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Priority (lower runs first)</Label>
            <Input type="number" value={draft.priority ?? 100} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Starts at</Label>
            <Input type="datetime-local" value={draft.starts_at ?? ""} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} />
          </div>
          <div>
            <Label>Ends at</Label>
            <Input type="datetime-local" value={draft.ends_at ?? ""} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={draft.is_active ?? true} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <span className="text-sm">Active</span>
            </div>
            <Button onClick={saveRule}><Save className="w-4 h-4 mr-2" /> Save rule</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet.</p>
          ) : (
            <div className="divide-y">
              {rules.map((r) => {
                const meta = ACTION_META[r.action];
                const Icon = meta.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.name}</span>
                        <Badge variant={meta.variant}><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                        <Badge variant="outline">{r.scope_type}{r.scope_value ? `: ${r.scope_value}` : ""}</Badge>
                        <Badge variant="outline">w={r.weight}</Badge>
                        <Badge variant="outline">p={r.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.product_ids?.length ?? 0} products</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

export default MerchandisingRulesManager;
