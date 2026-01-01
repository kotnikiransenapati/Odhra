import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shirt, Smartphone, Home, Sparkles, Dumbbell } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, React.ReactNode> = {
  'fashion': <Shirt className="w-8 h-8" />,
  'electronics': <Smartphone className="w-8 h-8" />,
  'home-living': <Home className="w-8 h-8" />,
  'beauty': <Sparkles className="w-8 h-8" />,
  'sports-fitness': <Dumbbell className="w-8 h-8" />,
};

const categoryGradients: Record<string, string> = {
  'fashion': 'from-rose-500/20 to-pink-500/20',
  'electronics': 'from-blue-500/20 to-cyan-500/20',
  'home-living': 'from-amber-500/20 to-orange-500/20',
  'beauty': 'from-purple-500/20 to-violet-500/20',
  'sports-fitness': 'from-green-500/20 to-emerald-500/20',
};

export function CategoryShowcase() {
  const { data: categories, isLoading } = useCategories();

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Shop by Category</h2>
            <p className="text-muted-foreground">Explore our curated collections</p>
          </div>
          <Link 
            to="/shop" 
            className="hidden md:flex items-center gap-2 text-accent hover:underline font-medium group"
          >
            View All
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories?.slice(0, 5).map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/shop?category=${category.slug}`}
                  className="group relative block aspect-square rounded-2xl overflow-hidden"
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryGradients[category.slug] || 'from-accent/20 to-accent/10'} transition-all duration-300 group-hover:scale-110`} />
                  
                  {/* Glass overlay */}
                  <div className="absolute inset-0 glass opacity-50" />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                    <motion.div 
                      className="p-4 rounded-2xl bg-background/50 backdrop-blur-sm mb-4 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {categoryIcons[category.slug] || <Sparkles className="w-8 h-8" />}
                    </motion.div>
                    <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </div>

                  {/* Hover arrow */}
                  <motion.div
                    className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                    whileHover={{ scale: 1.1 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-6 text-center">
          <Link 
            to="/shop" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            View All Categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
