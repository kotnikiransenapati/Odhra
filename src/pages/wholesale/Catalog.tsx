import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload } from "lucide-react";
import { useWholesaleCart } from "@/hooks/useWholesaleCart";
import { useWholesaler } from "@/hooks/useWholesaler";

const sb = supabase as any;

interface CatalogRow {
  id: string;
  name: string;
  image_url: string | null;
  settings: {
    min_order_qty: number;
    pack_size: number;
    gst_rate: number;
    lead_time_days: number;
    hsn_code: string | null;
  } | null;
  tiers: Array<{ tier: string; min_qty: number; unit_price: number }>;
}

export default function WholesaleCatalog() {
  const { account } = useWholesaler();
  const tier = account?.tier ?? "standard";
  const { addItem } = useWholesaleCart();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [csv, setCsv] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: settings } = await sb
        .from("wholesale_product_settings")
        .select("product_id,min_order_qty,pack_size,gst_rate,lead_time_days,hsn_code,enabled")
        .eq("enabled", true)
        .limit(200);
      const ids = (settings ?? []).map((s: any) => s.product_id);
      if (!ids.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      const [{ data: products }, { data: tiers }] = await Promise.all([
        sb.from("products").select("id,name,image_url").in("id", ids),
        sb.from("wholesale_price_tiers").select("product_id,tier,min_qty,unit_price").in("product_id", ids),
      ]);
      const tierMap: Record<string, any[]> = {};
      (tiers ?? []).forEach((t: any) => {
        (tierMap[t.product_id] ||= []).push(t);
      });
      const settingsMap: Record<string, any> = {};
      (settings ?? []).forEach((s: any) => (settingsMap[s.product_id] = s));
      const merged: CatalogRow[] = (products ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        settings: settingsMap[p.id],
        tiers: (tierMap[p.id] || []).sort((a, b) => a.min_qty - b.min_qty),
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [rows, query],
  );

  const bulkImportCsv = async () => {
    // Lines: <product_id_or_name>, qty
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;
    for (const line of lines) {
      const [ref, qStr] = line.split(/[,\t]/).map((x) => x.trim());
      const qty = Math.max(1, parseInt(qStr || "0", 10) || 0);
      if (!ref || !qty) continue;
      const match = rows.find(
        (r) => r.id === ref || r.name.toLowerCase() === ref.toLowerCase(),
      );
      if (match) {
        await addItem(match.id, qty, tier);
        added++;
      }
    }
    if (added) setCsv("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wholesale Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Tier <Badge variant="outline" className="ml-1 uppercase">{tier}</Badge> pricing applied automatically.
          </p>
        </div>
        <Input
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="md:max-w-sm"
        />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Quick CSV order</div>
            <div className="text-xs text-muted-foreground">One line per item: <code>productId,qty</code> or <code>product name,qty</code>.</div>
          </div>
          <Button size="sm" onClick={bulkImportCsv} disabled={!csv.trim()}>Import</Button>
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={3}
          placeholder="namkeen-mix,50&#10;chivda-classic,100"
          className="w-full rounded border border-border bg-background p-2 text-sm font-mono"
        />
      </Card>

      {loading ? (
        <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const settings = r.settings;
            const minQty = settings?.min_order_qty ?? 1;
            const pack = settings?.pack_size ?? 1;
            const qty = qtyMap[r.id] ?? minQty;
            const tierPrices = r.tiers.filter((t) => t.tier === tier);
            const fallback = r.tiers.filter((t) => t.tier === "standard");
            const effectiveTiers = tierPrices.length ? tierPrices : fallback;
            const active = [...effectiveTiers].reverse().find((t) => t.min_qty <= qty);
            return (
              <Card key={r.id} className="p-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded bg-muted overflow-hidden shrink-0">
                    {r.image_url && (
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      MOQ {minQty} · Pack {pack} · GST {settings?.gst_rate ?? 0}%
                    </div>
                    {active && (
                      <div className="mt-1 text-lg font-bold">
                        ₹{Number(active.unit_price).toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground"> /unit</span>
                      </div>
                    )}
                  </div>
                </div>
                {effectiveTiers.length > 1 && (
                  <div className="text-xs flex flex-wrap gap-1">
                    {effectiveTiers.map((t) => (
                      <Badge
                        key={t.min_qty}
                        variant={active?.min_qty === t.min_qty ? "default" : "outline"}
                      >
                        {t.min_qty}+ · ₹{Number(t.unit_price).toFixed(0)}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={minQty}
                    step={pack}
                    value={qty}
                    onChange={(e) =>
                      setQtyMap((m) => ({ ...m, [r.id]: Math.max(minQty, parseInt(e.target.value) || minQty) }))
                    }
                    className="w-24"
                  />
                  <Button
                    className="flex-1"
                    onClick={() => addItem(r.id, qty, tier)}
                    disabled={!active}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add to bulk cart
                  </Button>
                </div>
              </Card>
            );
          })}
          {!filtered.length && (
            <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
              No wholesale products match your search.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
