import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, Flame } from 'lucide-react';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Props {
  title: string;
  subtitle?: string;
  sortBy: 'trending' | 'rating' | 'newest' | 'popular';
  limit?: number;
  viewAllLink?: string;
  badge?: string;
}

/** Food-styled horizontal rail of dish cards. Uses real products. */
export function FoodDishRail({ title, subtitle, sortBy, limit = 10, viewAllLink, badge }: Props) {
  const { data, isLoading } = useProducts({ sortBy, limit });
  const items = Array.isArray(data) ? data : [];

  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-3 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {badge && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent">{badge}</span>}
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <Link to={viewAllLink} className="text-sm font-semibold text-accent hover:underline whitespace-nowrap">
              View all →
            </Link>
          )}
        </div>

        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-64 h-72 rounded-2xl shrink-0" />
              ))
            : items.map((p: any) => <FoodDishCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

export function FoodDishCard({ product: p }: { product: any }) {
  const img = p.product_images?.find((i: any) => i.is_primary)?.url || p.product_images?.[0]?.url;
  const discount = p.compare_at_price && p.compare_at_price > p.price
    ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
    : 0;
  const rating = Number(p.avg_rating ?? 0);

  return (
    <Link
      to={`/product/${p.slug}`}
      className="group shrink-0 w-64 md:w-72 bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {img ? (
          <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-md">
            <Flame className="w-3 h-3" /> {discount}% off
          </span>
        )}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur text-xs font-semibold">
          <Clock className="w-3 h-3 text-success" /> 30–40 min
        </span>
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-tight line-clamp-1 group-hover:text-accent transition-colors">
            {p.title}
          </h3>
          {rating > 0 && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success text-success-foreground text-xs font-bold">
              {rating.toFixed(1)} <Star className="w-3 h-3 fill-current" />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {p.description || p.vendors_public?.brand_name || 'Freshly prepared'}
        </p>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-foreground">{inr(p.price)}</span>
          {discount > 0 && (
            <span className="text-xs text-muted-foreground line-through">{inr(p.compare_at_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
