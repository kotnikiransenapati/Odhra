import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Store, BadgeCheck, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { haptic } from "@/lib/haptics";
import {
  useFavoriteVendors,
  useUnfollowVendor,
  useUpdateFavoriteVendorPrefs,
} from "@/hooks/useFavoriteVendors";

export function FavoriteVendorsPanel() {
  const { data: rows = [], isLoading } = useFavoriteVendors();
  const unfollow = useUnfollowVendor();
  const updatePrefs = useUpdateFavoriteVendorPrefs();

  if (!isLoading && rows.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Followed sellers"
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Store className="w-4 h-4 text-accent" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Followed sellers</h2>
            <p className="text-[11px] text-muted-foreground">Get pings for new products & sales</p>
          </div>
        </div>
        {rows.length > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{rows.length}</span>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const v = row.vendor;
            if (!v) return null;
            const href = v.slug ? `/store/${v.slug}` : `#`;
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/40"
              >
                <Link
                  to={href}
                  onClick={() => haptic("selection")}
                  className="flex items-center gap-3 flex-1 min-w-0 group"
                >
                  <div className="w-10 h-10 rounded-full bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                    {v.logo_url ? (
                      <img
                        src={v.logo_url}
                        alt={v.brand_name ?? "Seller logo"}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                        {v.brand_name ?? "Seller"}
                      </p>
                      {v.is_verified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" aria-label="Verified" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">View storefront</p>
                  </div>
                </Link>

                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    New
                    <Switch
                      checked={row.notify_new_products}
                      onCheckedChange={(v) =>
                        updatePrefs.mutate({ id: row.id, notify_new_products: v })
                      }
                      aria-label="Notify about new products"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    Sales
                    <Switch
                      checked={row.notify_sales}
                      onCheckedChange={(v) => updatePrefs.mutate({ id: row.id, notify_sales: v })}
                      aria-label="Notify about sales"
                    />
                  </label>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    haptic("medium");
                    unfollow.mutate(row.id);
                  }}
                  aria-label={`Unfollow ${v.brand_name ?? "seller"}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
