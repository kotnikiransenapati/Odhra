import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Eye, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingProducts } from "@/hooks/useTrendingProducts";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function TrendingNowCarousel() {
  const { data, isLoading } = useTrendingProducts(7, 12);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="py-6 md:py-8" aria-labelledby="trending-now-heading">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 id="trending-now-heading" className="text-lg md:text-2xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </span>
            Trending now
            <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">Last 7 days</Badge>
          </h2>
          <Link to="/shop?sort=trending" className="text-sm text-accent hover:underline inline-flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-1 px-1">
            {data!.map((p, i) => {
              const off = p.compare_at_price && p.compare_at_price > p.price
                ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100) : 0;
              const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="snap-start shrink-0 w-40 md:w-48"
                >
                  <Link to={href} className="block rounded-xl overflow-hidden border bg-card card-interactive">
                    <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                      {p.primary_image ? (
                        <img src={p.primary_image} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                        <Flame className="w-3 h-3" /> #{i + 1}
                      </span>
                      {off > 0 && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success text-success-foreground">
                          -{off}%
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/90 backdrop-blur inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {p.viewer_count}
                      </span>
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium line-clamp-2 leading-tight min-h-[2.25rem]">{p.title}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-accent">{inr(p.price)}</span>
                        {off > 0 && (
                          <span className="text-[10px] line-through text-muted-foreground">{inr(p.compare_at_price!)}</span>
                        )}
                      </div>
                      {p.vendor_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{p.vendor_name}</p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
