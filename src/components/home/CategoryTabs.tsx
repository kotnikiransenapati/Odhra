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
      <section className="py-2.5 bg-background border-b border-border/20">
        <div className="flex gap-6 px-4 overflow-x-auto scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[56px]">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="w-10 h-2.5" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-2.5 bg-background border-b border-border/20">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-5 px-4 min-w-max">
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
                  className="flex flex-col items-center gap-1 min-w-[56px] group"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/60 group-hover:bg-accent/10 flex items-center justify-center transition-all duration-200 group-hover:scale-105">
                    <IconComponent className="w-4 h-4 text-foreground/60 group-hover:text-accent transition-colors duration-200" strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-accent text-center whitespace-nowrap transition-colors duration-200">
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
