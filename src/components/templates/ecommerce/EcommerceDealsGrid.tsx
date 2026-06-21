import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

/**
 * Amazon-style "tile grid" — 4 themed product blocks above the fold.
 * Each tile shows 4 products + a category CTA. Pulls real products.
 */
export function EcommerceDealsGrid() {
  const tiles = [
    { title: "Today's Deals", sortBy: 'trending', to: '/shop?sort=trending' },
    { title: 'Top Rated', sortBy: 'rating', to: '/shop?sort=rating' },
    { title: 'New Arrivals', sortBy: 'newest', to: '/shop?sort=newest' },
    { title: 'Best Sellers', sortBy: 'popular', to: '/shop?sort=popular' },
  ] as const;

  return (
    <section className="px-3 -mt-12 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <DealsTile key={t.title} title={t.title} sortBy={t.sortBy} to={t.to} />
        ))}
      </div>
    </section>
  );
}

function DealsTile({ title, sortBy, to }: { title: string; sortBy: 'trending' | 'rating' | 'newest' | 'popular'; to: string }) {
  const { data, isLoading } = useProducts({ sortBy, limit: 4 });
  const items = (data?.products || []).slice(0, 4);

  return (
    <div className="bg-card border border-border rounded p-4 flex flex-col">
      <h3 className="font-bold text-base mb-3 text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded" />)
          : items.map((p: any) => {
              const img = p.product_images?.find((i: any) => i.is_primary)?.url || p.product_images?.[0]?.url;
              return (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="group flex flex-col"
                  title={p.title}
                >
                  <div className="aspect-square bg-secondary rounded overflow-hidden">
                    {img ? (
                      <img src={img} alt={p.title} className="w-full h-full object-contain p-1 group-hover:scale-105 transition" loading="lazy" />
                    ) : null}
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-accent">
                    {formatCurrency(p.price)}
                  </span>
                </Link>
              );
            })}
      </div>
      <Link to={to} className="mt-3 text-xs font-semibold text-info hover:underline">
        See all {title.toLowerCase()} →
      </Link>
    </div>
  );
}
