import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, FileCheck, Box, Truck, MapPin, XCircle, RotateCcw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type OrderTimelineStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderTimelineStep {
  key: OrderTimelineStatus | string;
  label: string;
  description?: string;
  timestamp?: string | null;
}

interface OrderTimelineProps {
  steps?: OrderTimelineStep[];
  currentStatus: string;
  variant?: "vertical" | "horizontal";
  compact?: boolean;
  className?: string;
}

const DEFAULT_STEPS: OrderTimelineStep[] = [
  { key: "pending", label: "Order Placed", description: "We have received your order" },
  { key: "confirmed", label: "Confirmed", description: "Seller accepted your order" },
  { key: "processing", label: "Processing", description: "Your order is being prepared" },
  { key: "shipped", label: "Shipped", description: "On the way to you" },
  { key: "out_for_delivery", label: "Out for Delivery", description: "Arriving soon" },
  { key: "delivered", label: "Delivered", description: "Order received" },
];

const ICONS: Record<string, React.ElementType> = {
  pending: FileCheck,
  confirmed: CheckCircle2,
  processing: Box,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: MapPin,
  cancelled: XCircle,
  refunded: RotateCcw,
};

const TERMINAL = new Set(["cancelled", "refunded"]);

export function OrderTimeline({
  steps,
  currentStatus,
  variant = "vertical",
  compact = false,
  className,
}: OrderTimelineProps) {
  const baseSteps = steps ?? DEFAULT_STEPS;
  const isTerminal = TERMINAL.has(currentStatus);
  const effectiveSteps: OrderTimelineStep[] = isTerminal
    ? [
        ...baseSteps.filter((s) => s.timestamp),
        {
          key: currentStatus,
          label: currentStatus === "cancelled" ? "Cancelled" : "Refunded",
          description:
            currentStatus === "cancelled"
              ? "This order was cancelled"
              : "Refund has been issued",
        },
      ]
    : baseSteps;

  const currentIdx = effectiveSteps.findIndex((s) => s.key === currentStatus);

  if (variant === "horizontal") {
    return (
      <ol
        className={cn(
          "flex items-start gap-2 overflow-x-auto pb-2 snap-x snap-mandatory",
          className
        )}
        aria-label="Order progress"
      >
        {effectiveSteps.map((step, idx) => {
          const reached = idx <= currentIdx;
          const isActive = idx === currentIdx && !isTerminal;
          const Icon = ICONS[step.key] ?? Circle;
          return (
            <li key={step.key} className="flex-1 min-w-[88px] snap-start">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                className="flex flex-col items-center text-center gap-1.5"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                    reached
                      ? isTerminal && idx === effectiveSteps.length - 1
                        ? "bg-destructive border-destructive text-destructive-foreground"
                        : "bg-accent border-accent text-accent-foreground"
                      : "bg-muted border-border text-muted-foreground",
                    isActive && "ring-4 ring-accent/20"
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </div>
                <p className={cn("text-[11px] font-medium leading-tight", !reached && "text-muted-foreground")}>
                  {step.label}
                </p>
                {step.timestamp ? (
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(step.timestamp), "dd MMM")}
                  </p>
                ) : null}
              </motion.div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("relative space-y-4", className)} aria-label="Order progress">
      {effectiveSteps.map((step, idx) => {
        const reached = idx <= currentIdx;
        const isLast = idx === effectiveSteps.length - 1;
        const isActive = idx === currentIdx && !isTerminal;
        const Icon = ICONS[step.key] ?? Circle;
        const dotClass = reached
          ? isTerminal && isLast
            ? "bg-destructive text-destructive-foreground"
            : "bg-accent text-accent-foreground"
          : "bg-muted text-muted-foreground";

        return (
          <motion.li
            key={`${step.key}-${idx}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 30 }}
            className="relative flex gap-3"
          >
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[18px] top-9 w-0.5 h-[calc(100%+0.5rem)] -translate-x-1/2",
                  reached && idx < currentIdx ? "bg-accent" : "bg-border"
                )}
              />
            )}
            <div
              className={cn(
                "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all",
                dotClass,
                isActive && "ring-4 ring-accent/20"
              )}
            >
              <Icon className="w-4 h-4" aria-hidden />
            </div>
            <div className={cn("flex-1 pt-1", compact && "pt-0.5")}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className={cn("text-sm font-semibold", !reached && "text-muted-foreground")}>
                  {step.label}
                </p>
                {step.timestamp ? (
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden />
                    {formatDistanceToNow(new Date(step.timestamp), { addSuffix: true })}
                  </span>
                ) : null}
              </div>
              {!compact && step.description ? (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
