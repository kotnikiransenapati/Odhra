import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Scale, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";
import { haptic } from "@/lib/haptics";

export function CompareBar() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();

  // Hide on the compare page itself + on checkout/auth surfaces
  if (
    pathname.startsWith("/compare") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/auth")
  )
    return null;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          key="compare-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(640px,calc(100vw-1rem))]"
          role="region"
          aria-label="Product compare tray"
        >
          <div className="glass rounded-2xl shadow-2xl border border-border/50 p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Scale className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium tabular-nums">
                {items.length}/4
              </span>
            </div>

            <ul className="flex gap-2 overflow-x-auto flex-1 min-w-0">
              {items.map((it) => (
                <li key={it.id} className="relative shrink-0">
                  <Link
                    to={`/product/${it.slug ?? it.id}`}
                    className="block w-12 h-12 rounded-lg overflow-hidden bg-muted ring-1 ring-border/50"
                    title={it.title}
                  >
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      haptic("warning");
                      remove(it.id);
                    }}
                    aria-label={`Remove ${it.title} from compare`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border/60 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  haptic("warning");
                  clear();
                }}
                className="text-xs"
              >
                Clear
              </Button>
              <Button asChild size="sm" disabled={items.length < 2}>
                <Link to="/compare" onClick={() => haptic("light")}>
                  Compare <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
