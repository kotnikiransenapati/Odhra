import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shirt, 
  Smartphone, 
  Home, 
  Sparkles, 
  Dumbbell, 
  Watch,
  Laptop,
  Camera,
  Headphones,
  ShoppingBag
} from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, React.ElementType> = {
  'fashion': Shirt,
  'electronics': Smartphone,
  'home-living': Home,
  'beauty': Sparkles,
  'sports-fitness': Dumbbell,
  'watches': Watch,
  'laptops': Laptop,
  'cameras': Camera,
  'audio': Headphones,
};

const defaultCategories = [
  { slug: 'for-you', name: 'For You', icon: ShoppingBag },
  { slug: 'fashion', name: 'Fashion', icon: Shirt },
  { slug: 'electronics', name: 'Electronics', icon: Smartphone },
  { slug: 'beauty', name: 'Beauty', icon: Sparkles },
  { slug: 'home-living', name: 'Home & Living', icon: Home },
  { slug: 'sports-fitness', name: 'Sports & Fitness', icon: Dumbbell },
];

export function CategoryTabs() {
  const { data: categories, isLoading } = useCategories();

  const displayCategories = categories && categories.length > 0 
    ? categories.slice(0, 8).map(cat => ({
        ...cat,
        icon: categoryIcons[cat.slug] || Sparkles
      }))
    : defaultCategories;

  if (isLoading) {
    return (
      <section className="py-3 bg-background border-b border-border/30">
        <div className="flex gap-6 px-4 overflow-x-auto scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-3 bg-background border-b border-border/30">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-6 px-4 min-w-max">
          {displayCategories.map((category, index) => {
            const IconComponent = (category as any).icon || categoryIcons[category.slug] || Sparkles;
            return (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={category.slug === 'for-you' ? '/shop' : `/shop?category=${category.slug}`}
                  className="flex flex-col items-center gap-1.5 min-w-[60px] group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/50 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                    <IconComponent className="w-5 h-5 text-foreground/70 group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-foreground/70 group-hover:text-accent text-center whitespace-nowrap transition-colors">
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
