import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, Loader2, PackageCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { haptic } from "@/lib/haptics";
import { useLeaveWaitlist, useMyWaitlistEntries } from "@/hooks/useWaitlist";

export function BackInStockAlertsPanel() {
  const { data: rows = [], isLoading } = useMyWaitlistEntries();
  const leave = useLeaveWaitlist();

  if (!isLoading && rows.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Back in stock alerts"
    >
      <header className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <BellRing className="w-4 h-4 text-accent" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Back-in-stock alerts</h2>
          <p className="text-[11px] text-muted-foreground">Products we are watching for you</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const p = r.product;
            if (!p) return null;
            const img =
              p.product_images?.find((i) => i.is_primary)?.url ||
              p.product_images?.[0]?.url ||
              "/placeholder.svg";
            const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
            const isAvailable = p.is_active && p.stock > 0;

            return (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/40">
                <Link
                  to={href}
                  onClick={() => haptic("selection")}
                  className="w-12 h-12 rounded-lg overflow-hidden bg-muted/30 shrink-0"
                >
                  <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={href} className="text-sm font-medium truncate block hover:text-accent">
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={isAvailable ? "default" : "secondary"} className="text-[10px]">
                      {isAvailable ? "Available now" : "Watching"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      added {formatDistanceToNow(new Date(r.created_at || Date.now()), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {isAvailable ? (
                  <Button asChild size="sm" className="h-8 gap-1.5 shrink-0">
                    <Link to={href}>
                      <PackageCheck className="w-3.5 h-3.5" aria-hidden /> Buy
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={leave.isPending}
                  onClick={() => {
                    haptic("medium");
                    leave.mutate(p.id);
                  }}
                  aria-label="Remove back-in-stock alert"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}