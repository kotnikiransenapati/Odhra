import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, BellOff, Trash2, TrendingDown, ExternalLink, Plus } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Watch {
  id: string;
  product_id: string;
  target_price: number;
  baseline_price: number;
  notified_at: string | null;
  notified_price: number | null;
  product: {
    id: string;
    title: string;
    price: number;
    primary_image: string | null;
    product_slug: string | null;
  } | null;
}

interface Props {
  productId?: string;
  productPrice?: number;
  productTitle?: string;
  variant?: "panel" | "button";
}

export function PriceWatchButton({ productId, productPrice, productTitle }: Required<Pick<Props, "productId" | "productPrice">> & { productTitle?: string }) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<{ id: string; target_price: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(String(Math.max(1, Math.floor(productPrice * 0.9))));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !productId) return;
    (async () => {
      const { data } = await supabase.from("price_watches")
        .select("id, target_price").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
      if (data) setExisting({ id: data.id, target_price: Number(data.target_price) });
      else setExisting(null);
    })();
  }, [user?.id, productId]);

  const save = async () => {
    if (!user?.id) { toast.error("Sign in to set price alerts"); return; }
    const tp = Number(target);
    if (!tp || tp <= 0 || tp >= productPrice) {
      toast.error("Target must be below current price"); return;
    }
    setBusy(true);
    try {
      const payload = {
        user_id: user.id,
        product_id: productId,
        target_price: tp,
        baseline_price: productPrice,
      };
      const { error } = existing
        ? await supabase.from("price_watches").update({ target_price: tp }).eq("id", existing.id)
        : await supabase.from("price_watches").insert(payload);
      if (error) throw error;
      haptic("success");
      toast.success(existing ? "Alert updated" : "We'll notify you when the price drops");
      setExisting({ id: existing?.id || "tmp", target_price: tp });
      setOpen(false);
    } catch (e: any) {
      haptic("error");
      toast.error(e.message || "Failed to save");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    const { error } = await supabase.from("price_watches").delete().eq("id", existing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setExisting(null);
    toast.success("Alert removed");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={existing ? "default" : "outline"} size="sm" className="gap-1.5">
          {existing ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {existing ? `Watching ₹${existing.target_price}` : "Notify on price drop"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Price drop alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {productTitle && <p className="text-sm text-muted-foreground line-clamp-2">{productTitle}</p>}
          <p className="text-xs text-muted-foreground">Current price: <span className="font-semibold text-foreground">₹{productPrice.toLocaleString()}</span></p>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Notify me when price drops to (₹)</label>
            <Input type="number" value={target} onChange={e => setTarget(e.target.value)} max={productPrice - 1} />
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-between gap-2">
          {existing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Remove
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{existing ? "Update" : "Watch"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PriceWatchPanel() {
  const { user } = useAuth();
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("price_watches")
      .select(`id, product_id, target_price, baseline_price, notified_at, notified_price,
               product:products!inner(id, title, price, primary_image, product_slug)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWatches((data as any as Watch[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useRealtimeChannel({
    channel: `price-watches-${user?.id}`,
    enabled: !!user?.id,
    bindings: [{
      event: "*", schema: "public", table: "price_watches",
      filter: `user_id=eq.${user?.id}`, callback: () => load(),
    }],
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("price_watches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setWatches(prev => prev.filter(w => w.id !== id));
    toast.success("Removed");
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-accent" /> Price Drop Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : watches.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No price alerts yet</p>
            <p className="text-xs mt-1">Open any product and tap "Notify on price drop" to add it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {watches.map((w, i) => {
              const cur = w.product?.price ?? 0;
              const hit = cur > 0 && cur <= w.target_price;
              const delta = w.baseline_price > 0 ? ((cur - w.baseline_price) / w.baseline_price) * 100 : 0;
              const slug = w.product?.product_slug || w.product?.id;
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
                >
                  <Link to={`/product/${slug}`} className="w-14 h-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                    {w.product?.primary_image ? (
                      <img src={w.product.primary_image} alt="" className="w-full h-full object-contain" />
                    ) : null}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${slug}`} className="font-semibold text-sm hover:text-accent line-clamp-1">
                      {w.product?.title || "Product"}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm font-bold">₹{cur.toLocaleString()}</span>
                      <span className="text-[11px] text-muted-foreground">target ₹{w.target_price.toLocaleString()}</span>
                      {delta < 0 && (
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                          ▼ {Math.abs(delta).toFixed(0)}%
                        </Badge>
                      )}
                      {hit && <Badge className="bg-accent text-accent-foreground text-[10px]">Hit!</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button asChild size="icon" variant="ghost">
                      <Link to={`/product/${slug}`}><ExternalLink className="w-4 h-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(w.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PriceWatchPanel;
