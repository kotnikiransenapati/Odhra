import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { StickyNote, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useProductNotes,
  useTogglePinProductNote,
  useDeleteProductNote,
} from "@/hooks/useProductNotes";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";

export function ProductNotesPanel() {
  const { user } = useAuth();
  const { data: notes, isLoading } = useProductNotes();
  const togglePin = useTogglePinProductNote();
  const del = useDeleteProductNote();

  if (!user) return null;

  return (
    <section className="glass rounded-2xl p-5" aria-label="My product notes">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">My product notes</h2>
        </div>
        {notes && notes.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{notes.length}</span>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : !notes || notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tap "Add note" on any product to leave a private reminder — only you can see it.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 p-3 flex gap-3"
            >
              {n.product?.images?.[0] && (
                <Link
                  to={`/product/${n.product.slug ?? n.product.id}`}
                  className="shrink-0"
                  onClick={() => haptic("light")}
                >
                  <img
                    src={n.product.images[0]}
                    alt={n.product.title}
                    loading="lazy"
                    className="w-14 h-14 rounded-lg object-cover bg-muted"
                  />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={n.product ? `/product/${n.product.slug ?? n.product.id}` : "#"}
                    className="text-sm font-medium hover:text-accent truncate"
                  >
                    {n.product?.title ?? "Product"}
                  </Link>
                  {n.pinned && <Pin className="w-3.5 h-3.5 text-accent shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                  {n.note}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => togglePin.mutate(n)}
                    aria-label={n.pinned ? "Unpin note" : "Pin note"}
                  >
                    {n.pinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive"
                    onClick={() => {
                      haptic("warning");
                      del.mutate(n.id);
                    }}
                    aria-label="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
