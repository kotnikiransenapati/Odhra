import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronDown, 
  Shirt, 
  Smartphone, 
  Home, 
  Sparkles as SparklesIcon, 
  Dumbbell,
  ArrowRight,
  Loader2
} from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  'fashion': <Shirt className="w-5 h-5" />,
  'electronics': <Smartphone className="w-5 h-5" />,
  'home-living': <Home className="w-5 h-5" />,
  'beauty': <SparklesIcon className="w-5 h-5" />,
  'sports-fitness': <Dumbbell className="w-5 h-5" />,
};

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .is('parent_id', null)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button 
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        Categories
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[600px] glass rounded-2xl p-6 shadow-2xl border border-border/50"
          >
            {/* Decorative top arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-l border-t border-border/50" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Shop by Category</h3>
                <Link 
                  to="/shop" 
                  className="text-sm text-accent hover:underline flex items-center gap-1 group"
                >
                  View All
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {categories?.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/shop?category=${category.slug}`}
                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-all group"
                      >
                        <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                          {categoryIcons[category.slug] || <SparklesIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm group-hover:text-accent transition-colors">
                            {category.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {category.description}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Featured Banner */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">New Arrivals</p>
                    <p className="text-sm text-primary-foreground/80">Discover the latest collections</p>
                  </div>
                  <Link 
                    to="/shop?filter=new" 
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    Shop Now
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
