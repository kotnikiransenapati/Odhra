import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Amazon-style dense category strip. Real categories from DB,
 * 8 across on desktop / horizontal scroll on mobile.
 */
export function EcommerceCategoryStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ['ecommerce-category-strip'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, image_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(16);
      if (error) return [];
      return data || [];
    },
  });

  return (
    <section className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-3 py-3 overflow-x-auto">
        <div className="flex md:grid md:grid-cols-8 gap-2 md:gap-3 min-w-max md:min-w-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-24 md:w-auto rounded" />
              ))
            : (data || []).map((c: any) => (
                <Link
                  key={c.id}
                  to={`/shop?category=${c.slug}`}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded border border-transparent hover:border-border hover:bg-secondary/40 transition w-24 md:w-auto shrink-0"
                >
                  <div className="w-16 h-16 rounded overflow-hidden bg-secondary flex items-center justify-center">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {c.name?.[0] ?? '·'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center line-clamp-2 group-hover:text-accent">
                    {c.name}
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
