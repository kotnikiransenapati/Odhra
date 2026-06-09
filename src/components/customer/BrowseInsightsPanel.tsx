import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, TrendingUp, Store, Tag, IndianRupee, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrowseInsights } from "@/hooks/useBrowseInsights";

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 rounded-sm bg-accent/30 hover:bg-accent transition-colors"
          style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
          title={`${d.date}: ${d.count} views`}
        />
      ))}
    </div>
  );
}

export function BrowseInsightsPanel() {
  const { data, isLoading } = useBrowseInsights();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Browse insights</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.totalViews === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> Browse insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start exploring products and we'll show your personal trends here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" /> Browse insights
          <Badge variant="secondary" className="ml-auto text-[10px]">Last 30 days</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-accent/5 p-3">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Views</div>
            <div className="text-lg font-bold">{data.totalViews}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-lg bg-accent/5 p-3">
            <div className="text-xs text-muted-foreground">Products</div>
            <div className="text-lg font-bold">{data.uniqueProducts}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg bg-accent/5 p-3">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Avg price</div>
            <div className="text-lg font-bold">{data.avgPrice != null ? `₹${data.avgPrice.toLocaleString("en-IN")}` : "—"}</div>
          </motion.div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Activity (7 days)
            </p>
          </div>
          <Sparkline data={data.last7Days} />
        </div>

        {data.topCategories.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1">
              <Tag className="w-3 h-3" /> Top categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topCategories.map((c) => (
                <Badge key={c.name} variant="outline" className="text-xs">
                  {c.name} <span className="ml-1 text-muted-foreground">·{c.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.topVendors.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1">
              <Store className="w-3 h-3" /> Favorite brands
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topVendors.map((v) => {
                const inner = (
                  <Badge variant="secondary" className="text-xs">
                    {v.name} <span className="ml-1 text-muted-foreground">·{v.count}</span>
                  </Badge>
                );
                return v.slug ? (
                  <Link key={v.name} to={`/store/${v.slug}`}>{inner}</Link>
                ) : (
                  <span key={v.name}>{inner}</span>
                );
              })}
            </div>
          </div>
        )}

        {data.mostViewedProduct && (
          <Link
            to={data.mostViewedProduct.slug ? `/product/${data.mostViewedProduct.slug}` : `/product/${data.mostViewedProduct.id}`}
            className="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {data.mostViewedProduct.image ? (
                <img src={data.mostViewedProduct.image} alt={data.mostViewedProduct.title} className="w-full h-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Most viewed</p>
              <p className="text-sm font-medium truncate">{data.mostViewedProduct.title}</p>
            </div>
            <Badge variant="default" className="text-xs">{data.mostViewedProduct.views}×</Badge>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
