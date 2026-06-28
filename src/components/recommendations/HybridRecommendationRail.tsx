import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHybridRecommendations } from "@/hooks/useHybridRecommendations";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

interface Props {
  anchorProductId?: string;
  limit?: number;
  priceBand?: { min: number; max: number };
  title?: string;
  className?: string;
}

/**
 * Personalized rail powered by the hybrid recommender.
 * Renders nothing when no signal is available — never shows random fillers
 * so users don't get noisy, untrustworthy "picks for you".
 */
export function HybridRecommendationRail({
  anchorProductId,
  limit = 8,
  priceBand,
  title = "Picked for you",
  className = "",
}: Props) {
  const { data, isLoading } = useHybridRecommendations({ anchorProductId, limit, priceBand });

  if (isLoading) {
    return (
      <section className={`my-8 ${className}`} aria-label={title}>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
          <Sparkles className="h-5 w-5 text-primary" /> {title}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!data?.length) return null;

  return (
    <section className={`my-8 ${className}`} aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xl">
          <Sparkles className="h-5 w-5 text-primary" /> {title}
        </h2>
        <span className="text-xs text-muted-foreground">Based on what you’ve viewed & bought</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.map((p) => (
          <Link key={p.id} to={`/product/${p.slug || p.id}`} className="group">
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={p.image || "/placeholder.svg"}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <CardContent className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                <p className="mt-1 text-sm font-semibold">{formatPriceINR(p.price)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default HybridRecommendationRail;
