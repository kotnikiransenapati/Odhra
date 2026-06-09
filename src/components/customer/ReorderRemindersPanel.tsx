import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, BellOff, CalendarClock, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useReorderReminders,
  useUpdateReorderReminder,
  useDeleteReorderReminder,
} from "@/hooks/useReorderReminders";
import { haptic } from "@/lib/haptics";

const INTERVAL_OPTIONS = [7, 14, 30, 60, 90];

export function ReorderRemindersPanel() {
  const { data: rows = [], isLoading } = useReorderReminders();
  const update = useUpdateReorderReminder();
  const remove = useDeleteReorderReminder();

  if (!isLoading && rows.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Reorder reminders"
    >
      <header className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <CalendarClock className="w-4 h-4 text-accent" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Reorder reminders</h2>
          <p className="text-[11px] text-muted-foreground">We'll nudge you when it's time to restock</p>
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
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card/40"
              >
                <Link
                  to={href}
                  onClick={() => haptic("selection")}
                  className="w-12 h-12 rounded-lg overflow-hidden bg-muted/30 shrink-0"
                >
                  <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={r.interval_days}
                      onChange={(e) => update.mutate({ id: r.id, interval_days: Number(e.target.value) })}
                      className="text-[11px] bg-background border border-border/60 rounded-md px-1.5 py-0.5"
                      aria-label="Reminder interval"
                    >
                      {INTERVAL_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          every {d}d
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      next {formatDistanceToNow(new Date(r.next_remind_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.enabled ? <Bell className="w-3.5 h-3.5 text-accent" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => update.mutate({ id: r.id, enabled: v })}
                    aria-label="Toggle reminder"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      haptic("medium");
                      remove.mutate(r.id);
                    }}
                    aria-label="Remove reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
