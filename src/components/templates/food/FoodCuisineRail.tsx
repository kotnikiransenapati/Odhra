import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

/** Circular cuisine pill rail — real categories from DB, food-styled. */
export function FoodCuisineRail() {
  const { data, isLoading } = useQuery({
    queryKey: ['food-cuisine-rail'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, image_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(14);
      return data || [];
    },
  });

  return (
    <section className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-3 py-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">What's on your plate?</h2>
            <p className="text-sm text-muted-foreground">Pick a cuisine, we'll deliver hot</p>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-accent hover:underline">View all</Link>
        </div>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center gap-2">
                  <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
                  <Skeleton className="w-16 h-3" />
                </div>
              ))
            : (data || []).map((c: any, i: number) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="shrink-0"
                >
                  <Link to={`/shop?category=${c.slug}`} className="group flex flex-col items-center gap-2 w-24">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-accent transition bg-secondary">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                          {c.name?.[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-xs md:text-sm font-semibold text-center text-foreground group-hover:text-accent line-clamp-1">
                      {c.name}
                    </span>
                  </Link>
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
