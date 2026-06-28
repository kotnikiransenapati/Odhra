import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface Tier { id?: string; tier: string; min_qty: number; unit_price: number; }
interface Settings { enabled: boolean; min_order_qty: number; pack_size: number; gst_rate: number; lead_time_days: number; hsn_code: string; }

const EMPTY_SETTINGS: Settings = {
  enabled: true, min_order_qty: 1, pack_size: 1, gst_rate: 5, lead_time_days: 2, hsn_code: "",
};

export default function AdminWholesalePricing() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("products").select("id,name").order("name").limit(500);
      setProducts(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: t }] = await Promise.all([
        sb.from("wholesale_product_settings").select("*").eq("product_id", selectedId).maybeSingle(),
        sb.from("wholesale_price_tiers").select("*").eq("product_id", selectedId).order("min_qty"),
      ]);
      setSettings(s ? { ...EMPTY_SETTINGS, ...s, hsn_code: s.hsn_code ?? "" } : EMPTY_SETTINGS);
      setTiers((t ?? []) as Tier[]);
      setLoading(false);
    })();
  }, [selectedId]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { error: sErr } = await sb.from("wholesale_product_settings").upsert(
        { product_id: selectedId, ...settings },
        { onConflict: "product_id" },
      );
      if (sErr) throw sErr;

      await sb.from("wholesale_price_tiers").delete().eq("product_id", selectedId);
      if (tiers.length) {
        const rows = tiers
          .filter((t) => t.min_qty > 0 && t.unit_price >= 0)
          .map((t) => ({
            product_id: selectedId,
            tier: t.tier || "standard",
            min_qty: t.min_qty,
            unit_price: t.unit_price,
          }));
        if (rows.length) {
          const { error: tErr } = await sb.from("wholesale_price_tiers").insert(rows);
          if (tErr) throw tErr;
        }
      }
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4">
      <Card className="p-3">
        <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted ${selectedId === p.id ? "bg-muted font-semibold" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {!selectedId ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Select a product to configure wholesale.</Card>
        ) : loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Wholesale settings</div>
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
                  <span>{settings.enabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Min order qty" type="number" value={settings.min_order_qty}
                  onChange={(v) => setSettings({ ...settings, min_order_qty: parseInt(v) || 1 })} />
                <Field label="Pack size" type="number" value={settings.pack_size}
                  onChange={(v) => setSettings({ ...settings, pack_size: parseInt(v) || 1 })} />
                <Field label="GST %" type="number" value={settings.gst_rate}
                  onChange={(v) => setSettings({ ...settings, gst_rate: parseFloat(v) || 0 })} />
                <Field label="Lead time (days)" type="number" value={settings.lead_time_days}
                  onChange={(v) => setSettings({ ...settings, lead_time_days: parseInt(v) || 0 })} />
                <Field label="HSN code" value={settings.hsn_code}
                  onChange={(v) => setSettings({ ...settings, hsn_code: v })} />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Tier pricing</div>
                <Button size="sm" variant="outline"
                  onClick={() => setTiers([...tiers, { tier: "standard", min_qty: 1, unit_price: 0 }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add tier
                </Button>
              </div>
              <div className="space-y-2">
                {tiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <Input value={t.tier} onChange={(e) => { const a = [...tiers]; a[i].tier = e.target.value; setTiers(a); }} placeholder="tier (standard/silver/gold)" />
                    <Input type="number" value={t.min_qty} onChange={(e) => { const a = [...tiers]; a[i].min_qty = parseInt(e.target.value) || 0; setTiers(a); }} placeholder="min qty" />
                    <Input type="number" step="0.01" value={t.unit_price} onChange={(e) => { const a = [...tiers]; a[i].unit_price = parseFloat(e.target.value) || 0; setTiers(a); }} placeholder="unit ₹" />
                    <Button size="icon" variant="ghost" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {!tiers.length && <p className="text-xs text-muted-foreground">No tiers yet. Add at least one tier with min qty 1 to enable wholesale checkout.</p>}
              </div>
            </Card>

            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
