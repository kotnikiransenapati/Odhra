import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Sparkles, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriceHistory } from "@/hooks/usePriceHistory";

interface Props {
  productId: string;
  days?: number;
  className?: string;
}

const W = 600;
const H = 140;
const PAD = 12;

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function PriceHistoryChart({ productId, days = 90, className }: Props) {
  const { data, isLoading } = usePriceHistory(productId, days);

  const path = useMemo(() => {
    if (!data || data.points.length < 2) return "";
    const pts = data.points;
    const t0 = new Date(pts[0].recorded_at).getTime();
    const t1 = new Date(pts[pts.length - 1].recorded_at).getTime();
    const span = Math.max(1, t1 - t0);
    const range = Math.max(1, data.max - data.min);
    return pts
      .map((p, i) => {
        const x = PAD + ((new Date(p.recorded_at).getTime() - t0) / span) * (W - PAD * 2);
        const y = H - PAD - ((Number(p.price) - data.min) / range) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3"><CardTitle className="text-base">Price history</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-36 w-full" /></CardContent>
      </Card>
    );
  }
  if (!data || data.points.length < 2) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-accent" /> Price history
            <Badge variant="secondary" className="text-[10px]">Last {days} days</Badge>
          </CardTitle>
          {data.isAtOrNearLow ? (
            <Badge className="gap-1 bg-success text-success-foreground hover:bg-success">
              <Sparkles className="w-3 h-3" /> Near {days}-day low
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <TrendingDown className="w-3 h-3" /> {data.pctFromLow.toFixed(0)}% above low
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <motion.svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-36"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <defs>
            <linearGradient id="phFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="url(#phFill)" />
          <path d={path} stroke="hsl(var(--accent))" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* min reference line */}
          <line
            x1={PAD} x2={W - PAD}
            y1={H - PAD} y2={H - PAD}
            stroke="hsl(var(--border))" strokeDasharray="3 3"
          />
        </motion.svg>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold text-success">{fmt(data.lowestInRange)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Current</div>
            <div className="font-semibold">{fmt(data.current)}</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold">{fmt(data.max)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
