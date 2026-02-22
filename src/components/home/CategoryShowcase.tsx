import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shirt, Smartphone, Home, Sparkles, Dumbbell, Heart } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, React.ReactNode> = {
  'fashion': <Shirt className="w-8 h-8" />,
  'electronics': <Smartphone className="w-8 h-8" />,
  'home-living': <Home className="w-8 h-8" />,
  'beauty': <Heart className="w-8 h-8" />,
  'sports-fitness': <Dumbbell className="w-8 h-8" />,
};

const categoryGradients: Record<string, { bg: string; hover: string }> = {
  'fashion': { bg: 'from-primary/12 via-primary/8 to-primary/3', hover: 'group-hover:from-primary/20' },
  'electronics': { bg: 'from-info/12 via-info/8 to-info/3', hover: 'group-hover:from-info/20' },
  'home-living': { bg: 'from-accent/12 via-accent/8 to-accent/3', hover: 'group-hover:from-accent/20' },
  'beauty': { bg: 'from-destructive/10 via-destructive/6 to-destructive/2', hover: 'group-hover:from-destructive/18' },
  'sports-fitness': { bg: 'from-success/12 via-success/8 to-success/3', hover: 'group-hover:from-success/20' },
};

export function CategoryShowcase() {
  const { data: categories, isLoading } = useCategories();

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <span className="text-accent text-sm font-bold uppercase tracking-wider mb-2 block">
              Browse Categories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Shop by <span className="text-accent">Interest</span>
            </h2>
            <p className="text-muted-foreground font-medium">Find exactly what you're looking for</p>
          </div>
          <Link 
            to="/shop" 
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border/50 text-foreground hover:border-accent/50 font-semibold transition-colors group shadow-sm"
          >
            All Categories
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
            {categories?.slice(0, 5).map((category, index) => {
              const gradient = categoryGradients[category.slug] || { bg: 'from-accent/15 via-accent/10 to-accent/5', hover: 'group-hover:from-accent/25' };
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Link
                    to={`/shop?category=${category.slug}`}
                    className="group relative block aspect-square rounded-2xl overflow-hidden border border-border/40 hover:border-accent/40 transition-all duration-300 shadow-sm hover:shadow-lg"
                  >
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient.bg} ${gradient.hover} transition-all duration-500`} />
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-5 text-center">
                      <motion.div 
                        className="p-4 rounded-2xl bg-card/70 backdrop-blur-sm mb-4 text-foreground shadow-sm border border-border/30 group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent/50 transition-all duration-300"
                        whileHover={{ scale: 1.08, rotate: 3 }}
                      >
                        {categoryIcons[category.slug] || <Sparkles className="w-8 h-8" />}
                      </motion.div>
                      <h3 className="font-bold text-lg mb-1 text-foreground">{category.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {category.description || 'Explore collection'}
                      </p>
                    </div>

                    {/* Hover arrow */}
                    <motion.div
                      className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                      initial={false}
                      whileHover={{ scale: 1.1 }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border/50 font-semibold shadow-sm"
          >
            View All Categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}