import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Package, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAccountActivity, type ActivityKind } from "@/hooks/useAccountActivity";
import { haptic } from "@/lib/haptics";

const ICONS: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  order: Package,
  loyalty: Sparkles,
  session: ShieldCheck,
  review: Activity,
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function ActivityTimelinePanel() {
  const { data: items = [], isLoading } = useAccountActivity(12);

  if (!isLoading && items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Recent account activity"
    >
      <header className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-accent" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Recent activity</h2>
          <p className="text-[11px] text-muted-foreground">Orders, points & sign-ins in one place</p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <ol className="relative space-y-2 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
          {items.map((it) => {
            const Icon = ICONS[it.kind];
            const content = (
              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-accent/5 transition-colors">
                <div className="relative z-10 w-10 h-10 rounded-full bg-card border border-border/60 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-accent" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.title}</p>
                  {it.subtitle && (
                    <p className="text-[11px] text-muted-foreground capitalize truncate">{it.subtitle}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(it.occurred_at), { addSuffix: true })}
                    {typeof it.amount === "number" && ` · ${inr(it.amount)}`}
                  </p>
                </div>
                {it.href && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
                )}
              </div>
            );
            return (
              <li key={it.id}>
                {it.href ? (
                  <Link to={it.href} onClick={() => haptic("light")} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
