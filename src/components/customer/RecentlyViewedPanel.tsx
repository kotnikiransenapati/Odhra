import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentlyViewedServer } from "@/hooks/useRecentlyViewedServer";
import { haptic } from "@/lib/haptics";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function RecentlyViewedPanel() {
  const { items, loading, clear, remove } = useRecentlyViewedServer(12);

  if (!loading && items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Recently viewed products"
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-accent" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Recently viewed</h2>
            <p className="text-[11px] text-muted-foreground">Synced across your devices</p>
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              haptic("medium");
              clear();
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((row) => {
            const p = row.product;
            if (!p) return null;
            const img =
              p.product_images?.find((i) => i.is_primary)?.url ||
              p.product_images?.[0]?.url ||
              "/placeholder.svg";
            const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
            return (
              <div key={row.id} className="relative group">
                <Link
                  to={href}
                  onClick={() => haptic("selection")}
                  className="card-interactive block rounded-xl overflow-hidden bg-card border border-border/40"
                >
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    <img
                      src={img}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-2 leading-snug">{p.title}</p>
                    <p className="text-sm font-bold mt-1 tabular-nums">{inr(p.price)}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${p.title} from history`}
                  onClick={(e) => {
                    e.preventDefault();
                    haptic("light");
                    remove(row.id);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/90 border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
