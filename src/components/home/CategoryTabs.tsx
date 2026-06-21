import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shirt, Smartphone, Home, Sparkles, Dumbbell, Watch,
  Laptop, Camera, Headphones, ShoppingBag
} from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, React.ElementType> = {
  'fashion': Shirt, 'electronics': Smartphone, 'home-living': Home,
  'beauty': Sparkles, 'sports-fitness': Dumbbell, 'watches': Watch,
  'laptops': Laptop, 'cameras': Camera, 'audio': Headphones,
};

const defaultCategories = [
  { slug: 'for-you', name: 'For You', icon: ShoppingBag },
  { slug: 'fashion', name: 'Fashion', icon: Shirt },
  { slug: 'electronics', name: 'Electronics', icon: Smartphone },
  { slug: 'beauty', name: 'Beauty', icon: Sparkles },
  { slug: 'home-living', name: 'Home', icon: Home },
  { slug: 'sports-fitness', name: 'Sports', icon: Dumbbell },
];

export function CategoryTabs() {
  const { data: categories, isLoading } = useCategories();

  const displayCategories = categories && categories.length > 0 
    ? categories.slice(0, 8).map(cat => ({
        ...cat, icon: categoryIcons[cat.slug] || Sparkles
      }))
    : defaultCategories;

  if (isLoading) {
    return (
      <section className="py-5 bg-background">
        <div className="flex gap-7 px-4 overflow-x-auto scrollbar-hide max-w-7xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[68px]">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-12 h-2.5" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-5 bg-background">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-7 md:gap-9 px-4 min-w-max max-w-7xl mx-auto">
          {displayCategories.map((category, index) => {
            const IconComponent = (category as any).icon || categoryIcons[category.slug] || Sparkles;
            return (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={category.slug === 'for-you' ? '/shop' : `/shop?category=${category.slug}`}
                  className="flex flex-col items-center gap-2 min-w-[68px] group"
                >
                  <div className="w-14 h-14 rounded-full bg-secondary/70 group-hover:bg-accent/10 flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_-12px_hsl(var(--accent)/0.45)] ring-1 ring-border/40 group-hover:ring-accent/30">
                    <IconComponent className="w-5 h-5 text-foreground/70 group-hover:text-accent transition-colors duration-200" strokeWidth={1.6} />
                  </div>
                  <span className="text-[11px] font-medium tracking-wide text-foreground/75 group-hover:text-foreground text-center whitespace-nowrap transition-colors duration-200">
                    {category.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
