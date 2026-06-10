import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ShoppingCart, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { haptic } from "@/lib/haptics";
import { useCart, type SavedItem } from "@/contexts/CartContext";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SavedForLater() {
  const { savedItems, moveSavedToCart, removeSavedItem } = useCart();

  if (!savedItems || savedItems.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-4 sm:p-5 mt-6"
      aria-label="Saved for later"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-accent" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">Saved for later</h2>
            <p className="text-[11px] text-muted-foreground">
              {savedItems.length} item{savedItems.length === 1 ? "" : "s"} waiting
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Stored on your account
        </Badge>
      </header>
      <Separator className="mb-3" />
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {savedItems.map((item: SavedItem) => {
            const href = item.slug ? `/product/${item.slug}` : `/product/${item.product_id}`;
            const oos = (item.stock ?? 0) <= 0;
            return (
              <motion.li
                key={item.product_id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/40"
              >
                <Link
                  to={href}
                  onClick={() => haptic("selection")}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-muted/40 shrink-0"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title ?? "Product"}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-5 h-5" aria-hidden />
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={href}
                    className="text-sm font-medium truncate block hover:text-accent"
                  >
                    {item.title ?? "Saved product"}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {typeof item.price === "number" ? (
                      <span className="text-sm font-semibold">{formatPrice(item.price)}</span>
                    ) : null}
                    {oos ? (
                      <Badge variant="destructive" className="text-[10px]">Out of stock</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">In stock</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={oos}
                    className="h-8 gap-1.5"
                    onClick={() => {
                      haptic("success");
                      moveSavedToCart(item.product_id);
                    }}
                    aria-label="Move to cart"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" aria-hidden /> Move
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      haptic("medium");
                      removeSavedItem(item.product_id);
                    }}
                    aria-label="Remove saved item"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
